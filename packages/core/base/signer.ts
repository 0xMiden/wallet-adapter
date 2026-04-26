import type { NoteFilterTypes } from '@miden-sdk/miden-sdk';
import type { WalletAdapter, WalletAdapterProps } from './adapter';
import { BaseWalletAdapter } from './adapter';
import {
  MidenConsumeTransaction,
  MidenSendTransaction,
  MidenTransaction,
} from './transaction';
import { Asset, CreateAccountParams, InputNoteDetails, SignKind, TransactionOutput } from './types';

export type Adapter =
  | WalletAdapter
  | SignerWalletAdapter
  | MessageSignerWalletAdapter;

export interface SignerWalletAdapterProps<Name extends string = string>
  extends WalletAdapterProps<Name> {}

export type SignerWalletAdapter<Name extends string = string> =
  WalletAdapter<Name> & SignerWalletAdapterProps<Name>;

export abstract class BaseSignerWalletAdapter<Name extends string = string>
  extends BaseWalletAdapter<Name>
  implements SignerWalletAdapter<Name> {}

export interface MessageSignerWalletAdapterProps<Name extends string = string>
  extends WalletAdapterProps<Name> {
  requestTransaction(transaction: MidenTransaction): Promise<string>;
  requestAssets(): Promise<Asset[]>;
  requestPrivateNotes(
    noteFilterType: NoteFilterTypes,
    noteIds?: string[]
  ): Promise<InputNoteDetails[]>;
  signBytes(data: Uint8Array, kind: SignKind): Promise<Uint8Array>;
  importPrivateNote(note: Uint8Array): Promise<string>;
  requestConsumableNotes(): Promise<InputNoteDetails[]>;
  /**
   * Return serialized NoteFile bytes (NoteFile.serialize() output) for the
   * user's private notes. When `noteIds` is omitted or empty, returns ALL
   * the user's private notes for this dApp. When provided, returns only the
   * matching subset. Used by the React adapter's ingestState backfill so the
   * dApp's local MidenClient can ingest private notes (which never appear in
   * chain state) and treat them like any other note.
   *
   * IMPORTANT: this method MUST be silent — never prompt the user. If the
   * dApp does not yet hold the necessary permission, return an empty array
   * (NOT an error). Permission elevation flows through `requestPrivateNotes`,
   * which IS allowed to prompt.
   *
   * Optional — adapters without private-note state may omit. The React
   * adapter guards on capability presence before invoking.
   */
  requestPrivateNoteBytes?(noteIds?: string[]): Promise<Uint8Array[]>;
  waitForTransaction(
    txId: string,
    timeout?: number
  ): Promise<TransactionOutput>;
  requestSend(transaction: MidenSendTransaction): Promise<string>;
  requestConsume(transaction: MidenConsumeTransaction): Promise<string>;
  createAccount(params?: CreateAccountParams): Promise<string>;
}

export type MessageSignerWalletAdapter<Name extends string = string> =
  WalletAdapter<Name> & MessageSignerWalletAdapterProps<Name>;

export abstract class BaseMessageSignerWalletAdapter<
    Name extends string = string
  >
  extends BaseSignerWalletAdapter<Name>
  implements MessageSignerWalletAdapter<Name>
{
  abstract requestSend(transaction: MidenSendTransaction): Promise<string>;
  abstract requestConsume(
    transaction: MidenConsumeTransaction
  ): Promise<string>;
  abstract requestTransaction(transaction: MidenTransaction): Promise<string>;
  abstract requestAssets(): Promise<Asset[]>;
  abstract requestPrivateNotes(
    noteFilterType: NoteFilterTypes,
    noteIds?: string[]
  ): Promise<InputNoteDetails[]>;
  abstract signBytes(data: Uint8Array, kind: SignKind): Promise<Uint8Array>;
  abstract importPrivateNote(note: Uint8Array): Promise<string>;
  abstract requestConsumableNotes(): Promise<InputNoteDetails[]>;
  abstract waitForTransaction(
    txId: string,
    timeout?: number
  ): Promise<TransactionOutput>;
  abstract createAccount(params?: CreateAccountParams): Promise<string>;
}
