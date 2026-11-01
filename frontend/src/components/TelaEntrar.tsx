import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@/contexts/UserContext";
import { ApiError } from "../utils/api";
import { cpfValido, mascararCpf } from "../utils/cpf";

const MIN_SENHA = 8;

type CampoProps = {
  rotulo: string;
  valor: string;
  onChange: (texto: string) => void;
  placeholder?: string;
  segredo?: boolean;
  teclado?: "default" | "email-address" | "numeric";
};

function Campo({ rotulo, valor, onChange, placeholder, segredo, teclado = "default" }: CampoProps) {
  return (
    <View className="gap-2">
      <Text className="font-body-sm text-body-sm text-on-surface">{rotulo}</Text>
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#7d7080"
        secureTextEntry={segredo}
        keyboardType={teclado}
        autoCapitalize="none"
        autoCorrect={false}
        className="bg-surface-container rounded-xl border border-glass-border px-4 py-3 text-white font-body-md"
      />
    </View>
  );
}

// Tela única de acesso: entra com e-mail e senha ou cria uma conta nova.
export function TelaEntrar() {
  const { entrar, cadastrar } = useUser();
  const insets = useSafeAreaInsets();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const preenchido = modoCadastro
    ? nome.trim() && username.trim() && email.trim() && cpf && senha
    : email.trim() && senha;

  const enviar = async () => {
    if (modoCadastro && !cpfValido(cpf)) {
      setErro("Informe um CPF válido.");
      return;
    }
    if (modoCadastro && senha.length < MIN_SENHA) {
      setErro(`A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`);
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      if (modoCadastro) await cadastrar({ nome, username, email, senha, cpf });
      else await entrar(email, senha);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Algo deu errado. Tente de novo.");
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Text className="font-display-lg text-primary-container text-center" style={{ fontSize: 44, letterSpacing: 2 }}>
          GROOV
        </Text>
        <Text className="font-body-md text-body-md text-on-surface-variant text-center mt-1 mb-8">
          {modoCadastro ? "Crie sua conta para comprar ingressos." : "Entre para comprar ingressos e montar seus grupos."}
        </Text>

        <View className="gap-4">
          {modoCadastro && (
            <>
              <Campo rotulo="Nome" valor={nome} onChange={setNome} placeholder="Seu nome" />
              <Campo rotulo="Nome de usuário" valor={username} onChange={setUsername} placeholder="seu.usuario" />
            </>
          )}
          <Campo rotulo="E-mail" valor={email} onChange={setEmail} placeholder="voce@email.com" teclado="email-address" />
          {modoCadastro && (
            <Campo
              rotulo="CPF"
              valor={cpf}
              onChange={(texto) => setCpf(mascararCpf(texto))}
              placeholder="000.000.000-00"
              teclado="numeric"
            />
          )}
          <Campo
            rotulo={modoCadastro ? `Senha (mínimo ${MIN_SENHA} caracteres)` : "Senha"}
            valor={senha}
            onChange={setSenha}
            segredo
          />
        </View>

        {!!erro && <Text className="font-body-sm text-body-sm text-error mt-4 text-center">{erro}</Text>}

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!preenchido || enviando}
          onPress={enviar}
          className="rounded-xl overflow-hidden mt-6"
          style={{ opacity: preenchido && !enviando ? 1 : 0.5 }}
        >
          <View className="bg-primary-container py-4 items-center justify-center">
            {enviando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-headline-md text-white text-[16px]">{modoCadastro ? "Criar conta" : "Entrar"}</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setModoCadastro(!modoCadastro);
            setErro("");
          }}
          className="mt-5 items-center"
          hitSlop={8}
        >
          <Text className="font-body-sm text-body-sm text-primary underline">
            {modoCadastro ? "Já tenho conta" : "Ainda não tenho conta"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
