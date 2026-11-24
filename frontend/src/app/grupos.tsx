import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCarrinho } from "@/contexts/CarrinhoContext";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { BarraSegmentada } from "../components/BarraSegmentada";
import { MenuOpcoes, type OpcaoMenu } from "../components/MenuOpcoes";
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

type Aba = "grupos" | "pedidos";

const ehAba = (valor: unknown): valor is Aba => valor === "grupos" || valor === "pedidos";

const pendenteAtiva = (compra: CompraGrupo, agora: number) =>
  compra.status === "PENDENTE" && new Date(compra.expiraEm).getTime() > agora;

// Pendentes primeiro (a que vence antes no topo), depois confirmadas, depois expiradas.
function ordenarCompras(compras: CompraGrupo[], agora: number) {
  const peso = (compra: CompraGrupo) => (pendenteAtiva(compra, agora) ? 0 : compra.status === "CONFIRMADA" ? 1 : 2);
  return [...compras].sort(
    (a, b) => peso(a) - peso(b) || new Date(a.expiraEm).getTime() - new Date(b.expiraEm).getTime(),
  );
}

const ROTULO_STATUS: Record<Participante["status"], string> = {
  PAGO: "PAGO",
  PENDENTE: "PENDENTE",
  REEMBOLSADO: "REEMBOLSADO",
};

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function PilulaStatus({ status }: { status: Participante["status"] }) {
  const pago = status === "PAGO";
  return (
    <View
      className={`px-3 py-1 rounded-full border ${
        pago ? "border-secondary-container/30 bg-secondary-container/10" : "border-white/15 bg-white/5"
      }`}
    >
      <Text className={`font-label-caps text-[10px] ${pago ? "text-secondary-container" : "text-on-surface-variant"}`}>
        {ROTULO_STATUS[status]}
      </Text>
    </View>
  );
}

const ALTURA_FUNDO_CARD = 520;

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
  const [aberto, setAberto] = useState(false);
  const contagem = useContagem(compra.expiraEm);
  const pagos = compra.participantes.filter((participante) => participante.status === "PAGO").length;
  const total = compra.participantes.length;
  const faltam = total - pagos;
  const confirmada = compra.status === "CONFIRMADA";
  const expirada = compra.status === "EXPIRADA" || (compra.status === "PENDENTE" && contagem.encerrado);
  const evento = compra.lote.evento;
  const minhaCota = compra.participantes.find((participante) => participante.usuarioId === meuId);
  const possoPagar = compra.status === "PENDENTE" && !expirada && minhaCota?.status === "PENDENTE";

  const alternar = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAberto((atual) => !atual);
  };

  return (
    <View className="bg-[rgba(26,26,26,0.6)] border border-white/10 rounded-xl overflow-hidden p-4 gap-3">
      {evento.imagemUrl && (
        <Image
          source={{ uri: evento.imagemUrl }}
          blurRadius={6}
          resizeMode="cover"
          className="absolute top-0 left-0 right-0"
          style={{ height: ALTURA_FUNDO_CARD, opacity: 0.2 }}
        />
      )}

      <Pressable
        onPress={alternar}
        accessibilityRole="button"
        accessibilityState={{ expanded: aberto }}
        accessibilityLabel={`Compra em grupo de ${evento.titulo}`}
        className="gap-3"
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-3 gap-1">
            {evento.categoria?.nome && (
              <View className="self-start px-[9px] py-[3px] rounded-full bg-primary-container/20 border border-primary-container/30">
                <Text className="font-label-caps text-[10px] text-primary-container uppercase">{evento.categoria.nome}</Text>
              </View>
            )}
            <Text className="font-headline-md text-headline-md text-primary" numberOfLines={1}>
              {evento.titulo}
            </Text>
            <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
              {nomeGrupo ? `Grupo: ${nomeGrupo} • ` : ""}
              {formatarDataHora(evento.comecaEm)}
            </Text>
          </View>
          <View className="items-end">
            {confirmada ? (
              <Text className="font-label-caps text-label-caps text-secondary-container">CONFIRMADA</Text>
            ) : expirada ? (
              <Text className="font-label-caps text-label-caps text-error">EXPIRADA</Text>
            ) : (
              <>
                <Text className="font-label-caps text-[10px] text-on-surface-variant">RESERVA EXPIRA EM</Text>
                <Text className="font-ticket-data text-primary-container" style={{ fontSize: 20, lineHeight: 24 }}>
                  {formatarRestante(contagem)}
                </Text>
              </>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <BarraSegmentada total={total} pagos={pagos} />
          </View>
          <Text className="font-body-sm text-body-sm text-on-surface-variant">
            <Text className="font-headline-md text-primary">{pagos}/{total}</Text> Membros
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="font-body-sm text-body-sm text-on-surface-variant">Status:</Text>
            {minhaCota && <PilulaStatus status={minhaCota.status} />}
          </View>
          <MaterialIcons name={aberto ? "expand-less" : "expand-more"} size={24} color="#d4c0d7" />
        </View>
      </Pressable>

      {aberto && (
        <View className="gap-3 pt-3 border-t border-white/10">
          {!!evento.nomeLocal && (
            <View className="flex-row items-center gap-1.5">
              <MaterialIcons name="place" size={14} color="#d4c0d7" />
              <Text className="font-body-sm text-body-sm text-on-surface-variant" numberOfLines={1}>
                {evento.nomeLocal}
              </Text>
            </View>
          )}
          {!confirmada && !expirada && faltam > 0 && (
            <Text className="font-body-sm text-[11px] text-primary">
              Faltam {faltam} {faltam === 1 ? "compra" : "compras"} para confirmar desconto
            </Text>
          )}

          <View className="gap-2.5">
            {compra.participantes.map((participante) => (
              <View key={participante.id} className="flex-row items-center gap-3">
                <Avatar pessoa={participante.usuario} />
                <Text className="flex-1 font-body-md text-body-md text-primary" numberOfLines={1}>
                  {participante.usuarioId === meuId ? "Você" : participante.usuario.nome}
                  {participante.usuarioId === compra.iniciadorId ? " (Líder)" : ""}
                </Text>
                <PilulaStatus status={participante.status} />
              </View>
            ))}
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
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onVerIngresso}
              className="self-center rounded-lg"
              style={{ shadowColor: "#bc13fe", shadowOpacity: 0.4, shadowRadius: 7.5, shadowOffset: { width: 0, height: 0 }, elevation: 6 }}
            >
              <LinearGradient
                colors={["#00dce7", "#bc13fe"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="rounded-lg px-6 py-2.5"
              >
                <Text className="font-label-caps text-[12px] tracking-[1.2px] text-white">Visualizar Ingresso</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function CardGrupo({
  grupo,
  opcoes,
  onAbrir,
  onEscolherEvento,
  onConvidar,
}: {
  grupo: Grupo;
  opcoes: OpcaoMenu[];
  onAbrir: () => void;
  onEscolherEvento: () => void;
  onConvidar: () => void;
}) {
  // Tocar no card abre o grupo; o "…" e os botões internos ficam com o próprio toque.
  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={`Abrir grupo ${grupo.nome}`}
      className="bg-surface-container-low border border-white/10 rounded-xl p-4 gap-3"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 font-headline-md text-headline-md text-primary" numberOfLines={1}>
          {grupo.nome}
        </Text>
        {grupo.souLider && (
          <Text className="font-label-caps text-[10px] text-secondary-container">LÍDER</Text>
        )}
        <MenuOpcoes opcoes={opcoes} rotulo={`Opções do grupo ${grupo.nome}`} />
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
          onPress={onEscolherEvento}
          className="px-4 py-2 rounded-full border border-primary-container/50 bg-primary-container/10"
        >
          <Text className="font-label-caps text-label-caps text-primary">ESCOLHER EVENTO</Text>
        </TouchableOpacity>
        {grupo.souLider && (
          <TouchableOpacity
            onPress={onConvidar}
            className="flex-row items-center gap-1.5 px-4 py-2 rounded-full border border-white/15"
          >
            <MaterialIcons name="share" size={14} color="#ebb2ff" />
            <Text className="font-label-caps text-label-caps text-primary">CONVIDAR</Text>
          </TouchableOpacity>
        )}
      </View>
    </Pressable>
  );
}

export default function Grupos() {
  const router = useRouter();
  const params = useLocalSearchParams<{ aba?: string }>();
  // A aba vive na rota para dar para abrir direto em /grupos?aba=pedidos.
  const aba: Aba = ehAba(params.aba) ? params.aba : "grupos";
  const { user, token } = useUser();
  const { definirResultado } = useCarrinho();
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const espacoNavBar = useEspacoNavBar();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [compras, setCompras] = useState<CompraGrupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState(false);
  // Momento do último carregamento, usado para separar pendentes de expiradas.
  const [agora, setAgora] = useState(() => Date.now());

  const carregar = useCallback(async () => {
    if (!user) return;
    try {
      const [gruposApi, comprasApi] = await Promise.all([
        api<Grupo[]>(`/usuarios/${user.id}/grupos`, { token }),
        api<CompraGrupo[]>("/grupos/compras", { token }),
      ]);
      setGrupos(gruposApi);
      setCompras(comprasApi);
      setAgora(Date.now());
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

  const convidar = async (grupo: Grupo) => {
    try {
      await compartilharConvite(grupo.id, grupo.nome, token);
    } catch (error) {
      Alert.alert("Convite", error instanceof ApiError ? error.message : "Não foi possível gerar o convite.");
    }
  };

  const confirmar = (titulo: string, mensagem: string, acao: string, executar: () => Promise<void>) =>
    Alert.alert(titulo, mensagem, [
      { text: "Cancelar", style: "cancel" },
      {
        text: acao,
        style: "destructive",
        onPress: async () => {
          try {
            await executar();
          } catch (error) {
            Alert.alert(titulo, error instanceof ApiError ? error.message : "Tente de novo.");
          }
          await carregar();
        },
      },
    ]);

  const excluir = (grupo: Grupo) =>
    confirmar("Excluir grupo?", `${grupo.nome} será apagado para todos os membros.`, "Excluir", () =>
      api(`/grupos/${grupo.id}`, { method: "DELETE", token }),
    );

  const sair = (grupo: Grupo) =>
    confirmar("Sair do grupo?", `Você deixa de fazer parte de ${grupo.nome}.`, "Sair", () =>
      api(`/grupos/${grupo.id}/members/${user?.id}`, { method: "DELETE", token }),
    );

  // A API ainda não barra mudança de membros com pedido em andamento; a tela evita por enquanto.
  const temPedidoPendente = (grupoId: string) =>
    compras.some((compra) => compra.grupoId === grupoId && pendenteAtiva(compra, agora));
  const temPedidos = (grupoId: string) => compras.some((compra) => compra.grupoId === grupoId);

  // Para o líder é a tela de edição; para os demais, a lista de membros.
  const abrirGrupo = (grupo: Grupo) => router.push({ pathname: "/editar-grupo", params: { id: grupo.id } });

  const opcoesDoGrupo = (grupo: Grupo): OpcaoMenu[] => {
    const editar = () => abrirGrupo(grupo);
    if (grupo.souLider) {
      return [
        { rotulo: "Editar grupo", icone: "edit", onPress: editar },
        {
          rotulo: "Excluir grupo",
          icone: "delete-outline",
          onPress: () => excluir(grupo),
          destrutiva: true,
          desabilitada: temPedidos(grupo.id),
          motivo: "O grupo tem pedido ativo",
        },
      ];
    }
    return [
      { rotulo: "Ver membros", icone: "group", onPress: editar },
      {
        rotulo: "Sair do grupo",
        icone: "logout",
        onPress: () => sair(grupo),
        destrutiva: true,
        desabilitada: temPedidoPendente(grupo.id),
        motivo: "Há um pedido em andamento",
      },
    ];
  };

  const nomeDoGrupo = (grupoId: string) => grupos.find((grupo) => grupo.id === grupoId)?.nome;
  const pronto = !carregando && !erro;
  const comprasOrdenadas = ordenarCompras(compras, agora);
  const cotasPendentes = compras.filter(
    (compra) =>
      pendenteAtiva(compra, agora) &&
      compra.participantes.some((participante) => participante.usuarioId === user?.id && participante.status === "PENDENTE"),
  ).length;

  const abas: { id: Aba; rotulo: string }[] = [
    { id: "grupos", rotulo: "Grupos" },
    { id: "pedidos", rotulo: cotasPendentes > 0 ? `Pedidos (${cotasPendentes})` : "Pedidos" },
  ];

  return (
    <View className="flex-1 bg-background">
      <CabecalhoGroov
        esquerda={{ icone: "arrow-back", onPress: () => (router.canGoBack() ? router.back() : router.replace("/")), rotulo: "Voltar" }}
        direita={{ icone: "group-add", onPress: () => router.push("/criar-grupo"), rotulo: "Criar grupo" }}
      />
      <View className="flex-row gap-6 px-5 pt-4 border-b border-white/10">
        {abas.map((item) => {
          const ativa = item.id === aba;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.setParams({ aba: item.id })}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativa }}
              className="pb-3"
              style={{ borderBottomWidth: 2, borderBottomColor: ativa ? "#bc13fe" : "transparent" }}
            >
              <Text className={`font-body-md text-body-md ${ativa ? "text-primary-container font-bold" : "text-on-surface-variant"}`}>
                {item.rotulo}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => {
              setAtualizando(true);
              carregar();
            }} tintColor="#bc13fe" />}
      >
        <Text className="font-headline-lg-mobile text-headline-lg-mobile text-primary">
          {aba === "grupos" ? "Meus Grupos" : "Pedidos em Grupo"}
        </Text>
        <Text className="font-body-md text-body-md text-on-surface-variant mt-1 mb-6">
          {aba === "grupos" ? "Gerencie seus grupos e convide a galera." : "Acompanhe suas compras coletivas."}
        </Text>
        {aba === "grupos" && (
          <TouchableOpacity
            onPress={() => router.push("/entrar-grupo")}
            activeOpacity={0.8}
            className="self-start flex-row items-center gap-2 -mt-3 mb-6 px-4 py-2 rounded-full border border-white/15"
          >
            <MaterialIcons name="vpn-key" size={14} color="#ebb2ff" />
            <Text className="font-label-caps text-label-caps text-primary uppercase">Entrar com código</Text>
          </TouchableOpacity>
        )}

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

        {pronto && aba === "grupos" && grupos.length === 0 && (
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

        {pronto && aba === "pedidos" && compras.length === 0 && (
          <View className="items-center gap-4 py-10">
            <MaterialIcons name="receipt-long" size={48} color="#504254" />
            <Text className="font-body-md text-body-md text-on-surface-variant text-center">
              Nenhum pedido em grupo ainda. Escolha um evento e compre com seu grupo.
            </Text>
            <TouchableOpacity onPress={() => router.push("/")} className="bg-primary-container rounded-xl px-6 py-3">
              <Text className="font-label-caps text-label-caps text-white uppercase">Escolher evento</Text>
            </TouchableOpacity>
          </View>
        )}

        {pronto && aba === "grupos" && (
          <View className="gap-6">
            {grupos.map((grupo) => (
              <CardGrupo
                key={grupo.id}
                grupo={grupo}
                opcoes={opcoesDoGrupo(grupo)}
                onAbrir={() => abrirGrupo(grupo)}
                onEscolherEvento={() => router.push("/")}
                onConvidar={() => convidar(grupo)}
              />
            ))}
          </View>
        )}

        {pronto && aba === "pedidos" && (
          <View className="gap-6">
            {comprasOrdenadas.map((compra) => (
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
          </View>
        )}
      </ScrollView>
    </View>
  );
}
