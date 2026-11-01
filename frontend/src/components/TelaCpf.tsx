import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@/contexts/UserContext";
import { ApiError } from "../utils/api";
import { cpfValido, mascararCpf } from "../utils/cpf";

// Contas criadas antes da exigência do CPF passam por aqui uma vez, depois de entrar.
export function TelaCpf() {
  const { user, informarCpf, sair } = useUser();
  const insets = useSafeAreaInsets();
  const [cpf, setCpf] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const enviar = async () => {
    if (!cpfValido(cpf)) {
      setErro("Informe um CPF válido.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      await informarCpf(cpf);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Algo deu errado. Tente de novo.");
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-1 justify-center px-6" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface text-center">Falta só o seu CPF</Text>
        <Text className="font-body-md text-body-md text-on-surface-variant text-center mt-2 mb-8">
          {user?.nome}, agora o CPF é obrigatório para comprar e transferir ingressos. Ele fica guardado com segurança e
          não aparece para outras pessoas.
        </Text>

        <TextInput
          value={cpf}
          onChangeText={(texto) => setCpf(mascararCpf(texto))}
          placeholder="000.000.000-00"
          placeholderTextColor="#7d7080"
          keyboardType="numeric"
          autoCorrect={false}
          className="bg-surface-container rounded-xl border border-glass-border px-4 py-3.5 text-white font-body-md text-center"
        />
        {!!erro && <Text className="font-body-sm text-body-sm text-error mt-4 text-center">{erro}</Text>}

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={cpf.length < 14 || enviando}
          onPress={enviar}
          className="mt-6 bg-primary-container rounded-xl py-4 items-center"
          style={{ opacity: cpf.length >= 14 && !enviando ? 1 : 0.5 }}
        >
          {enviando ? <ActivityIndicator color="#ffffff" /> : <Text className="font-headline-md text-white text-[16px]">Salvar CPF</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={sair} className="mt-5 items-center" hitSlop={8}>
          <Text className="font-body-sm text-body-sm text-primary underline">Sair</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
