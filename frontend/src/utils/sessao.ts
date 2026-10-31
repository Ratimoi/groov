const CHAVE = "groov.token";

type ArmazemSeguro = {
  getItemAsync(chave: string): Promise<string | null>;
  setItemAsync(chave: string, valor: string): Promise<void>;
  deleteItemAsync(chave: string): Promise<void>;
};

// O expo-secure-store é um módulo nativo. Num APK gerado antes dele existir o import
// falha; nesse caso a sessão fica só na memória (some ao fechar o app) em vez de quebrar.
function carregarArmazem(): ArmazemSeguro | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-secure-store") as ArmazemSeguro;
  } catch {
    return null;
  }
}

const armazem = carregarArmazem();

export async function lerToken(): Promise<string | null> {
  try {
    return (await armazem?.getItemAsync(CHAVE)) ?? null;
  } catch {
    return null;
  }
}

export async function guardarToken(token: string): Promise<void> {
  try {
    await armazem?.setItemAsync(CHAVE, token);
  } catch {
    // sem armazenamento seguro: a sessão vale só até fechar o app
  }
}

export async function apagarToken(): Promise<void> {
  try {
    await armazem?.deleteItemAsync(CHAVE);
  } catch {
    // nada a apagar
  }
}
