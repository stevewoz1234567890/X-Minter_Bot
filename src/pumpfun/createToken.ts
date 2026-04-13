import { OnlinePumpSdk, PUMP_SDK } from '@pump-fun/pump-sdk';
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

export type CreatePumpTokenParams = {
  connection: Connection;
  /** Pays fees and becomes creator (`user` + `creator` in the program). */
  creator: Keypair;
  name: string;
  symbol: string;
  metadataUri: string;
  /** Micro-lamports per CU; raise if landing fails under load. */
  computeUnitPriceMicroLamports?: number;
  computeUnitLimit?: number;
};

export type CreatePumpTokenResult = {
  signature: string;
  mint: string;
};

export async function createPumpFunTokenV2(params: CreatePumpTokenParams): Promise<CreatePumpTokenResult> {
  const mint = Keypair.generate();
  const online = new OnlinePumpSdk(params.connection);
  const global = await online.fetchGlobal();

  const ix = await PUMP_SDK.createV2Instruction({
    mint: mint.publicKey,
    name: params.name.slice(0, 32),
    symbol: params.symbol.slice(0, 10),
    uri: params.metadataUri,
    creator: params.creator.publicKey,
    user: params.creator.publicKey,
    mayhemMode: false,
    cashback: false,
  });

  const cuLimit = params.computeUnitLimit ?? 400_000;
  const cuPrice = params.computeUnitPriceMicroLamports ?? 200_000;

  const budgetIxs = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: cuPrice }),
  ];

  const { blockhash, lastValidBlockHeight } = await params.connection.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({
    payerKey: params.creator.publicKey,
    recentBlockhash: blockhash,
    instructions: [...budgetIxs, ix],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign([params.creator, mint]);

  const signature = await params.connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  await params.connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  return { signature, mint: mint.publicKey.toBase58() };
}
