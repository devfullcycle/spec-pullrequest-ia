"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { toFileRow } from "@/components/files/format";
import type { LoadMoreResult } from "@/components/files/load-more";
import * as authApi from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/error-messages";
import type { ApiResult } from "@/lib/api/types";
import { completeFailureReason } from "@/lib/uploads/complete-failure";
import type {
  CancelUploadResult,
  CompleteUploadResult,
  ResumeUploadResult,
  StartUploadInput,
  StartUploadResult,
} from "@/lib/uploads/types";
import { createFolder as makeFolder, getFolderItems, renameItem as changeName } from "@/lib/dal/items";
import {
  discardUpload,
  finishUpload,
  resumeUpload as readUpload,
  startUpload as beginUpload,
} from "@/lib/dal/uploads";
import { LOGIN_PATH } from "@/lib/session/paths";
import { clearSession, refreshToken } from "@/lib/session/tokens";

/**
 * Encerra a Sessão deste navegador. As outras Sessões do Usuário continuam. Sair funciona
 * mesmo se a API falhar ou a Sessão já tiver acabado: os cookies são apagados de todo jeito.
 */
export async function logout(): Promise<void> {
  const token = await refreshToken();
  if (token) {
    const result = await authApi.logout({ refreshToken: token });
    if (!result.ok) {
      // A pessoa sai deste navegador de todo jeito, mas a Sessão continua valendo na API.
      console.error(
        `A API não encerrou a Sessão no logout (${result.error.status} ${result.error.code}).`,
      );
    }
  }
  await clearSession();
  redirect(LOGIN_PATH);
}

/** O cursor é opaco e vem do navegador: a ação só confere que ele é um texto. */
const cursorSchema = z.string().min(1).max(2048);

/** O id de um Item, ou `root` como destino. A API confere o resto. */
const itemIdSchema = z.string().min(1).max(64);

/**
 * A página seguinte de uma pasta (`root` ou o id dela), já no formato das linhas da lista. A
 * Sessão é conferida de novo, pela própria listagem na API.
 */
export async function loadMoreFolderItems(
  folderId: string,
  cursor: string,
): Promise<LoadMoreResult> {
  const parsedCursor = cursorSchema.safeParse(cursor);
  const parsedFolder = itemIdSchema.safeParse(folderId);
  if (!parsedCursor.success || !parsedFolder.success) {
    return { ok: false, message: errorMessage("validation_error") };
  }
  const result = await getFolderItems(parsedFolder.data, parsedCursor.data);
  if (!result.ok) {
    return { ok: false, message: errorMessage(result.error.code) };
  }
  return {
    ok: true,
    rows: result.data.items.map(toFileRow),
    nextCursor: result.data.nextCursor,
  };
}

/** O que o "Nova pasta" devolve ao diálogo: a pasta criada ou o erro, em português, do campo. */
export type CreateFolderResult =
  | { ok: true; name: string }
  | { ok: false; message: string };

/**
 * O nome de um Item: sem os espaços das pontas, de 1 a 255 caracteres. As outras regras (`/`,
 * caracteres de controle, "." e "..") são da API, e o `validation_error` dela vira a mensagem
 * de `INVALID_NAME`.
 */
const itemNameSchema = (emptyMessage: string) =>
  z
    .string()
    .trim()
    .min(1, emptyMessage)
    .max(255, "O nome pode ter até 255 caracteres.");

const INVALID_NAME =
  "O nome não pode ter “/” nem caracteres de controle, nem ser “.” ou “..”.";

/**
 * O trecho comum de "Nova pasta" e "Renomear": confere o nome e o id aqui, chama a API e traduz o
 * erro dela em português.
 */
async function runNameAction(
  id: string,
  name: string,
  emptyMessage: string,
  call: (id: string, name: string) => Promise<ApiResult<{ name: string }>>,
): Promise<CreateFolderResult> {
  const parsedName = itemNameSchema(emptyMessage).safeParse(name);
  const parsedId = itemIdSchema.safeParse(id);
  if (!parsedName.success) {
    return { ok: false, message: parsedName.error.issues[0].message };
  }
  if (!parsedId.success) {
    return { ok: false, message: errorMessage("validation_error") };
  }
  const result = await call(parsedId.data, parsedName.data);
  if (!result.ok) {
    const message =
      result.error.code === "validation_error"
        ? INVALID_NAME
        : errorMessage(result.error.code);
    return { ok: false, message };
  }
  return { ok: true, name: result.data.name };
}

/**
 * Cria uma pasta dentro de `parentId`. É uma Server Action, um endpoint público: o nome é
 * conferido aqui, e a Sessão, pela própria chamada à API.
 */
export async function createFolder(
  parentId: string,
  name: string,
): Promise<CreateFolderResult> {
  return runNameAction(parentId, name, "Informe um nome para a pasta.", (id, n) =>
    makeFolder({ name: n, parentId: id }),
  );
}

/** O que o "Renomear" devolve ao diálogo: o mesmo formato do "Nova pasta". */
export type RenameItemResult = CreateFolderResult;

/**
 * Renomeia um Item (pasta ou arquivo). É uma Server Action, um endpoint público: o nome é
 * conferido aqui, e a Sessão, pela própria chamada à API.
 */
export async function renameItem(
  id: string,
  name: string,
): Promise<RenameItemResult> {
  return runNameAction(id, name, "Informe um nome.", (itemId, n) =>
    changeName(itemId, { name: n }),
  );
}

/** A Server Action é um endpoint público: o que vem do navegador é conferido antes de ir à API. */
const startUploadSchema = z.object({
  name: z.string().min(1).max(255),
  sizeBytes: z.number().int().min(0),
  mimeType: z.string().max(255),
  parentId: itemIdSchema,
});

/**
 * Começa o envio de um arquivo para a pasta de destino: a API reserva o espaço e devolve o
 * endereço para onde o navegador manda os bytes. A Sessão é conferida pela própria chamada à API.
 */
export async function startUpload(
  input: StartUploadInput,
): Promise<StartUploadResult> {
  const parsed = startUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: errorMessage("validation_error") };
  }
  const result = await beginUpload(parsed.data);
  if (!result.ok) {
    return { ok: false, message: errorMessage(result.error.code) };
  }
  const { itemId, uploadUrl } = result.data;
  return { ok: true, itemId, uploadUrl };
}

/**
 * A sessão de um envio incompleto, de antes de fechar a aba. `gone` diz que o upload não existe
 * mais (`not_found`), e a tela o tira do painel sem aviso; outra falha o deixa esperando.
 */
export async function resumeUpload(itemId: string): Promise<ResumeUploadResult> {
  const parsed = itemIdSchema.safeParse(itemId);
  if (!parsed.success) return { ok: false, gone: false };
  const result = await readUpload(parsed.data);
  if (!result.ok) return { ok: false, gone: result.error.code === "not_found" };
  return { ok: true, uploadUrl: result.data.uploadUrl };
}

/** Conclui o envio, depois de os bytes chegarem ao storage. */
export async function completeUpload(
  itemId: string,
): Promise<CompleteUploadResult> {
  const parsed = itemIdSchema.safeParse(itemId);
  if (!parsed.success) {
    return {
      ok: false,
      message: errorMessage("validation_error"),
      reason: completeFailureReason("validation_error"),
    };
  }
  const result = await finishUpload(parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      message: errorMessage(result.error.code),
      reason: completeFailureReason(result.error.code),
    };
  }
  return { ok: true };
}

/**
 * Cancela o envio: a API apaga o upload pendente e devolve o espaço. Um erro aqui não muda o
 * destino do envio na tela, e o que ficou pendente é removido pela limpeza (docs/lld.md, seção 5).
 * O resultado volta ao motor de envio.
 */
export async function cancelUpload(itemId: string): Promise<CancelUploadResult> {
  const parsed = itemIdSchema.safeParse(itemId);
  if (!parsed.success) {
    return { ok: false, message: errorMessage("validation_error") };
  }
  const result = await discardUpload(parsed.data);
  if (!result.ok) {
    // `not_found` é o upload que já foi concluído ou removido: não há o que desfazer.
    if (result.error.code !== "not_found") {
      console.error(
        `A API não cancelou o upload ${parsed.data} (${result.error.status} ${result.error.code}).`,
      );
    }
    return { ok: false, message: errorMessage(result.error.code) };
  }
  return { ok: true };
}
