import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCarrinho } from "@/contexts/CarrinhoContext";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { useContagem } from "../hooks/useContagem";
import { formatarDataHora, formatarRestante } from "../utils/evento";
import { api, ApiError } from "../utils/api";
import { compartilharConvite } from "../utils/convite";
import type { CompraGrupoApi as CompraGrupo, ParticipanteApi as Participante, PessoaApi as Pessoa } from "../utils/compras";

type Grupo = {
  id: string;
  nome: string;
  souLider: boolean;
  membros: { usuarioId: string; usuario: Pessoa }[];
};

const ROTULO_STATUS: Record<Participante["status"], string> = {
  PAGO: "PAGO",
  PENDENTE: "PENDENTE",
  REEMBOLSADO: "REEMBOLSADO",
};

function Avatar({ pessoa, tamanho = 32 }: { pessoa: Pessoa; tamanho?: number }) {
  return (
    <View
      className="rounded-full overflow-hidden bg-surface-container-high border border-primary-container/40"
      style={{ width: tamanho, height: tamanho }}
    >
      {pessoa.avatarUrl && <Image source={{ uri: pessoa.avatarUrl }} className="w-full h-full" />}
    </View>
  );
}

function CardCompra({
  compra,
  meuId,
  nomeGrupo,
  onPagar,
  pagando,
  onVerIngresso,
}: {
  compra: CompraGrupo;
  meuId: string;
  nomeGrupo?: string;
  onPagar: (compra: CompraGrupo) => void;
  pagando: boolean;
  onVerIngresso: () => void;
}) {
  const contagem = useContagem(compra.expiraEm);
  const pagos = compra.participantes.filter((participante) => participante.status === "PAGO").length;
  const total = compra.participantes.length;
  const faltam = total - pagos;
  const confirmada = compra.status === "CONFIRMADA";
  const expirada = compra.status === "EXPIRADA" || (compra.status === "PENDENTE" && contagem.encerrado);
  const evento = compra.lote.evento;
  const minhaCota = compra.participantes.find((participante) => participante.usuarioId === meuId);
  const possoPagar = compra.status === "PENDENTE" && !expirada && minhaCota?.status === "PENDENTE";

  return (
    <View className="bg-surface-container-low border border-white/10 rounded-xl p-4 gap-3">
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-3 gap-1">
          {evento.categoria?.nome && (
            <View className="self-start px-2 py-0.5 rounded bg-primary-container/20 border border-primary-container/40">
              <Text className="font-label-caps text-[10px] text-primary uppercase">{evento.categoria.nome}</Text>
            </View>
          )}
          <Text className="font-headline-md text-headline-md text-primary" numberOfLines={2}>
            {evento.titulo}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <MaterialIcons name="calendar-today" size={13} color="#d4c0d7" />
            <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
              {formatarDataHora(evento.comecaEm)}
              {evento.nomeLocal ? ` • ${evento.nomeLocal}` : ""}
            </Text>
          </View>
          {!!nomeGrupo && (
            <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
              Grupo: {nomeGrupo}
            </Text>
          )}
        </View>
        <View className="items-end">
          {confirmada ? (
            <Text className="font-label-caps text-label-caps text-secondary-container">CONFIRMADA</Text>
          ) : expirada ? (
            <Text className="font-label-caps text-label-caps text-error">EXPIRADA</Text>
          ) : (
            <>
              <View className="flex-row items-center gap-1">
                <MaterialIcons name="timer" size={18} color="#bc13fe" />
                <Text className="font-ticket-data text-primary-container" style={{ fontSize: 18 }}>
                  {formatarRestante(contagem)}
                </Text>
              </View>
              <Text className="font-label-caps text-[10px] text-on-surface-variant">EXPIRA EM</Text>
            </>
          )}
        </View>
      </View>

      <View className="rounded-lg border border-white/10 p-3 gap-2">
        <View className="flex-row justify-between items-end">
          <Text className="font-body-sm text-body-sm text-on-surface-variant">Progresso do Lote</Text>
          <Text className="font-body-sm text-body-sm text-on-surface-variant">
            <Text className="font-headline-md text-primary" style={{ fontSize: 20 }}>
              {pagos}/{total}
            </Text>{" "}
            Membros
          </Text>
        </View>
        <View className="h-2 rounded-full bg-surface-container-high overflow-hidden">
          <View
            className="h-full rounded-full bg-primary-container"
            style={{ width: `${total === 0 ? 0 : (pagos / total) * 100}%` }}
          />
        </View>
        {!confirmada && !expirada && faltam > 0 && (
          <Text className="font-body-sm text-[11px] text-primary text-right">
            Faltam {faltam} {faltam === 1 ? "compra" : "compras"} para confirmar desconto
          </Text>
        )}
      </View>

      <View className="gap-2.5">
        {compra.participantes.map((participante) => {
          const pago = participante.status === "PAGO";
          return (
            <View key={participante.id} className="flex-row items-center gap-3">
              <Avatar pessoa={participante.usuario} />
              <Text className="flex-1 font-body-md text-body-md text-primary" numberOfLines={1}>
                {participante.usuarioId === meuId ? "Você" : participante.usuario.nome}
                {participante.usuarioId === compra.iniciadorId ? " (Líder)" : ""}
              </Text>
              <View
                className={`px-3 py-1 rounded-full border ${
                  pago ? "border-secondary-container/50 bg-secondary-container/10" : "border-white/15 bg-white/5"
                }`}
              >
                <Text className={`font-label-caps text-[10px] ${pago ? "text-secondary-container" : "text-on-surface-variant"}`}>
                  {ROTULO_STATUS[participante.status]}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {possoPagar && (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={pagando}
          onPress={() => onPagar(compra)}
          className="rounded-xl bg-primary-container py-3 items-center"
          style={{ opacity: pagando ? 0.6 : 1 }}
        >
          {pagando ? <ActivityIndicator color="#ffffff" /> : <Text className="font-label-caps text-label-caps text-white uppercase">Pagar minha cota</Text>}
        </TouchableOpacity>
      )}
      {confirmada && (
        <TouchableOpacity activeOpacity={0.8} onPress={onVerIngresso} className="self-center rounded-lg overflow-hidden bg-secondary-container px-6 py-2.5">
          <Text className="font-label-caps text-label-caps text-on-secondary uppercase">Visualizar Ingresso</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function Grupos() {
  const router = useRouter();
  const { user, token } = useUser();
  const { definirResultado } = useCarrinho();
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const espacoNavBar = useEspacoNavBar();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [compras, setCompras] = useState<CompraGrupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    if (!user) return;
    try {
      const [gruposApi, comprasApi] = await Promise.all([
        api<Grupo[]>(`/usuarios/${user.id}/grupos`, { token }),
        api<CompraGrupo[]>("/grupos/compras", { token }),
      ]);
      setGrupos(gruposApi);
      setCompras(comprasApi);
      setErro(false);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
      setErro(true);
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [user, token]);

  // Recarrega ao voltar para a aba (por exemplo, depois de criar um grupo).
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const pagarCota = async (compra: CompraGrupo) => {
    setPagandoId(compra.id);
    try {
      const atualizada = await api<CompraGrupo>(`/grupos/compras/${compra.id}/pagar`, { method: "POST", token });
      definirResultado({ pedidos: [], compraGrupo: atualizada, nomeGrupo: grupos.find((grupo) => grupo.id === compra.grupoId)?.nome });
      await carregar();
      router.push("/pagamento-confirmado");
    } catch (error) {
      Alert.alert("Não foi possível pagar", error instanceof ApiError ? error.message : "Tente de novo.");
      await carregar();
    } finally {
      setPagandoId(null);
    }
  };

  const gruposSemCompra = grupos.filter((grupo) => !compras.some((compra) => compra.grupoId === grupo.id));
  const convidar = async (grupo: Grupo) => {
    try {
      await compartilharConvite(grupo.id, grupo.nome, token);
    } catch (error) {
      Alert.alert("Convite", error instanceof ApiError ? error.message : "Não foi possível gerar o convite.");
    }
  };

  const nomeDoGrupo = (grupoId: string) => grupos.find((grupo) => grupo.id === grupoId)?.nome;
  const vazio = !carregando && !erro && grupos.length === 0;

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov
        esquerda={{ icone: "arrow-back", onPress: () => (router.canGoBack() ? router.back() : router.replace("/")), rotulo: "Voltar" }}
        direita={{ icone: "group-add", onPress: () => router.push("/criar-grupo"), rotulo: "Criar grupo" }}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => {
              setAtualizando(true);
              carregar();
            }} tintColor="#bc13fe" />}
      >
        <Text className="font-headline-lg-mobile text-headline-lg-mobile text-primary">Meus Grupos</Text>
        <Text className="font-body-md text-body-md text-on-surface-variant mt-1 mb-6">
          Gerencie suas compras coletivas ativas.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/entrar-grupo")}
          activeOpacity={0.8}
          className="self-start flex-row items-center gap-2 -mt-3 mb-6 px-4 py-2 rounded-full border border-white/15"
        >
          <MaterialIcons name="vpn-key" size={14} color="#ebb2ff" />
          <Text className="font-label-caps text-label-caps text-primary uppercase">Entrar com código</Text>
        </TouchableOpacity>

        {carregando && <ActivityIndicator color="#bc13fe" className="my-10" />}

        {erro && !carregando && (
          <View className="items-center gap-3 py-10">
            <Text className="font-body-md text-body-md text-on-surface text-center">Não foi possível carregar seus grupos.</Text>
            <TouchableOpacity
              onPress={() => {
                setCarregando(true);
                carregar();
              }}
              className="px-5 py-2 rounded-full border border-primary-container"
            >
              <Text className="font-label-caps text-label-caps text-primary uppercase">Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        )}

        {vazio && (
          <View className="items-center gap-4 py-10">
            <MaterialIcons name="groups" size={48} color="#504254" />
            <Text className="font-body-md text-body-md text-on-surface-variant text-center">
              Você ainda não está em nenhum grupo. Crie um e convide a galera para pagar menos.
            </Text>
            <TouchableOpacity onPress={() => router.push("/criar-grupo")} className="bg-primary-container rounded-xl px-6 py-3">
              <Text className="font-label-caps text-label-caps text-white uppercase">Criar grupo</Text>
            </TouchableOpacity>
          </View>
        )}

        {!carregando && !erro && (
          <View className="gap-6">
            {compras.map((compra) => (
              <CardCompra
                key={compra.id}
                compra={compra}
                meuId={user?.id ?? ""}
                nomeGrupo={nomeDoGrupo(compra.grupoId)}
                onPagar={pagarCota}
                pagando={pagandoId === compra.id}
                onVerIngresso={() => router.push("/perfil")}
              />
            ))}

            {gruposSemCompra.map((grupo) => (
              <View key={grupo.id} className="bg-surface-container-low border border-white/10 rounded-xl p-4 gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 font-headline-md text-headline-md text-primary" numberOfLines={1}>
                    {grupo.nome}
                  </Text>
                  {grupo.souLider && (
                    <Text className="font-label-caps text-[10px] text-secondary-container">LÍDER</Text>
                  )}
                </View>
                <View className="flex-row items-center gap-2">
                  <View className="flex-row">
                    {grupo.membros.slice(0, 5).map((membro, indice) => (
                      <View key={membro.usuarioId} style={{ marginLeft: indice === 0 ? 0 : -8 }}>
                        <Avatar pessoa={membro.usuario} />
                      </View>
                    ))}
                  </View>
                  <Text className="font-body-sm text-body-sm text-on-surface-variant">
                    {grupo.membros.length} {grupo.membros.length === 1 ? "participante" : "participantes"}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <TouchableOpacity
                    onPress={() => router.push("/")}
                    className="px-4 py-2 rounded-full border border-primary-container/50 bg-primary-container/10"
                  >
                    <Text className="font-label-caps text-label-caps text-primary">ESCOLHER EVENTO</Text>
                  </TouchableOpacity>
                  {grupo.souLider && (
                    <TouchableOpacity
                      onPress={() => convidar(grupo)}
                      className="flex-row items-center gap-1.5 px-4 py-2 rounded-full border border-white/15"
                    >
                      <MaterialIcons name="share" size={14} color="#ebb2ff" />
                      <Text className="font-label-caps text-label-caps text-primary">CONVIDAR</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
