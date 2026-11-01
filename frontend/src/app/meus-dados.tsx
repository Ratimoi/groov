import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser, type DadosEditaveis } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { ApiError } from "../utils/api";
import { cpfValido, mascararCpf } from "../utils/cpf";

type CampoProps = {
  rotulo: string;
  valor: string;
  onChange: (texto: string) => void;
  placeholder?: string;
  teclado?: "default" | "email-address" | "numeric";
  ajuda?: string;
};

function Campo({ rotulo, valor, onChange, placeholder, teclado = "default", ajuda }: CampoProps) {
  return (
    <View className="gap-2">
      <Text className="font-body-sm text-body-sm text-on-surface">{rotulo}</Text>
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#7d7080"
        keyboardType={teclado}
        autoCapitalize="none"
        autoCorrect={false}
        className="bg-surface-container rounded-xl border border-glass-border px-4 py-3 text-white font-body-md"
      />
      {!!ajuda && <Text className="font-body-sm text-[12px] text-on-surface-variant">{ajuda}</Text>}
    </View>
  );
}

// Ver e alterar os dados da conta. O CPF nunca volta da API: aqui só se informa ou troca.
export default function MeusDados() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { user, atualizarDados } = useUser();
  const [nome, setNome] = useState(user?.nome ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [cpf, setCpf] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);

  const voltar = () => (router.canGoBack() ? router.back() : router.replace("/perfil"));

  const mudancas: DadosEditaveis = {};
  if (nome.trim() && nome.trim() !== user?.nome) mudancas.nome = nome.trim();
  if (username.trim() && username.trim() !== user?.username) mudancas.username = username.trim();
  if (email.trim() && email.trim() !== user?.email) mudancas.email = email.trim();
  if (cpf) mudancas.cpf = cpf;
  const alterado = Object.keys(mudancas).length > 0;

  const salvar = async () => {
    if (mudancas.cpf && !cpfValido(mudancas.cpf)) {
      setErro("Informe um CPF válido.");
      return;
    }
    setSalvando(true);
    setErro("");
    setSalvo(false);
    try {
      await atualizarDados(mudancas);
      setCpf("");
      setSalvo(true);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  const situacaoCpf = user?.temCpf === true ? "Cadastrado" : user?.temCpf === false ? "Não informado" : "Não disponível";

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltar, rotulo: "Voltar" }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Meus Dados</Text>
        <Text className="font-body-md text-body-md text-on-surface-variant mt-1 mb-6">Confira e atualize as informações da sua conta.</Text>

        <View className="gap-4">
          <Campo rotulo="Nome" valor={nome} onChange={setNome} />
          <Campo rotulo="Nome de usuário" valor={username} onChange={setUsername} />
          <Campo rotulo="E-mail" valor={email} onChange={setEmail} teclado="email-address" />

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="font-body-sm text-body-sm text-on-surface">CPF</Text>
              <View className="flex-row items-center gap-1">
                <MaterialIcons
                  name={user?.temCpf ? "check-circle" : "info-outline"}
                  size={14}
                  color={user?.temCpf ? "#10b981" : "#9d8ba0"}
                />
                <Text className="font-body-sm text-[12px] text-on-surface-variant">{situacaoCpf}</Text>
              </View>
            </View>
            <TextInput
              value={cpf}
              onChangeText={(texto) => setCpf(mascararCpf(texto))}
              placeholder={user?.temCpf ? "Digite só se quiser trocar o CPF" : "000.000.000-00"}
              placeholderTextColor="#7d7080"
              keyboardType="numeric"
              autoCorrect={false}
              className="bg-surface-container rounded-xl border border-glass-border px-4 py-3 text-white font-body-md"
            />
            <Text className="font-body-sm text-[12px] text-on-surface-variant">
              Por segurança, o CPF salvo não é exibido. Ele não aparece para outras pessoas.
            </Text>
          </View>
        </View>

        {!!erro && <Text className="font-body-sm text-body-sm text-error mt-4 text-center">{erro}</Text>}
        {salvo && !erro && (
          <Text className="font-body-sm text-body-sm text-center mt-4" style={{ color: "#10b981" }}>
            Dados atualizados.
          </Text>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!alterado || salvando}
          onPress={salvar}
          className="mt-6 bg-primary-container rounded-xl py-4 items-center"
          style={{ opacity: alterado && !salvando ? 1 : 0.5 }}
        >
          {salvando ? <ActivityIndicator color="#ffffff" /> : <Text className="font-headline-md text-white text-[16px]">Salvar alterações</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
