import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@/contexts/UserContext";
import { CabecalhoGroov } from "../components/CabecalhoGroov";
import { Campo } from "../components/Campo";
import { SeletorPonto } from "../components/Mapa";
import { useEspacoNavBar } from "../hooks/useEspacoNavBar";
import { api, ApiError } from "../utils/api";
import { obterPosicao } from "../utils/localizacao";
import { formatarReais } from "../utils/lote";
import {
  corpoEvento,
  ETAPAS,
  formDoEvento,
  formVazio,
  lerDataHora,
  lerPreco,
  listaDeTags,
  mascararData,
  mascararHora,
  novaAtracao,
  novoLote,
  validarEtapa,
  type AtracaoForm,
  type EventoForm,
  type LoteForm,
} from "../utils/publicar";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="bg-surface-container-low border border-white/10 rounded-2xl p-4 gap-4">
      <Text className="font-headline-md text-headline-md text-white">{titulo}</Text>
      {children}
    </View>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text className="font-body-sm text-body-sm text-on-surface-variant">{rotulo}</Text>
      <Text className="flex-1 text-right font-body-sm text-body-sm text-white" numberOfLines={2}>
        {valor || "—"}
      </Text>
    </View>
  );
}

// Publicar (ou editar) um evento em etapas. Quem publica vira o gerente do evento.
export default function Publicar() {
  const router = useRouter();
  const espacoNavBar = useEspacoNavBar();
  const { token } = useUser();
  const { eventoId } = useLocalSearchParams<{ eventoId?: string }>();
  const edicao = !!eventoId;

  const [form, setForm] = useState<EventoForm>(formVazio);
  const [etapa, setEtapa] = useState(0);
  const [carregando, setCarregando] = useState(edicao);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [avisoLocal, setAvisoLocal] = useState("");
  // Muda quando o ponto é limpo, para o mapa recomeçar sem marcador.
  const [versaoMapa, setVersaoMapa] = useState(0);
  const [publicado, setPublicado] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if (!eventoId) return;
    let cancelado = false;
    api<Parameters<typeof formDoEvento>[0]>(`/eventos/${eventoId}`)
      .then((evento) => {
        if (!cancelado) setForm(formDoEvento(evento));
      })
      .catch(() => {
        if (!cancelado) setErro("Não foi possível carregar o evento.");
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [eventoId]);

  const usarMinhaLocalizacao = async () => {
    setAvisoLocal("");
    const r = await obterPosicao();
    if (!r.ok) return setAvisoLocal(r.motivo);
    setForm((atual) => ({ ...atual, latitude: r.posicao.lat.toFixed(6), longitude: r.posicao.lng.toFixed(6) }));
  };

  const alterar = <K extends keyof EventoForm>(campo: K, valor: EventoForm[K]) => {
    setErro("");
    setForm((atual) => ({ ...atual, [campo]: valor }));
  };

  const alterarAtracao = (chave: string, mudanca: Partial<AtracaoForm>) =>
    alterar("atracoes", form.atracoes.map((a) => (a.chave === chave ? { ...a, ...mudanca } : a)));
  const alterarLote = (chave: string, mudanca: Partial<LoteForm>) =>
    alterar("lotes", form.lotes.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));

  const ultimaEtapa = ETAPAS.length - 1;
  // Na edição os lotes não mudam aqui, então a etapa de ingressos é pulada.
  const etapas = edicao ? ETAPAS.filter((_, i) => i !== 3) : [...ETAPAS];
  const indice = edicao && etapa > 3 ? etapa - 1 : etapa;

  const voltarEtapa = () => {
    setErro("");
    if (etapa === 0) return router.canGoBack() ? router.back() : router.replace("/perfil");
    setEtapa(edicao && etapa === 4 ? 2 : etapa - 1);
  };

  const avancar = () => {
    const problema = validarEtapa(etapa, form, { edicao });
    if (problema) return setErro(problema);
    setErro("");
    setEtapa(edicao && etapa === 2 ? 4 : etapa + 1);
  };

  const publicar = async () => {
    for (let i = 0; i < ultimaEtapa; i++) {
      const problema = validarEtapa(i, form, { edicao });
      if (problema) {
        setEtapa(i);
        return setErro(problema);
      }
    }
    setEnviando(true);
    setErro("");
    try {
      const corpo = corpoEvento(form, { edicao });
      const evento = edicao
        ? await api<{ id: string }>(`/eventos/${eventoId}`, { token, method: "PUT", body: corpo })
        : await api<{ id: string }>("/eventos", { token, method: "POST", body: corpo });
      setPublicado({ id: evento.id });
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível publicar. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  const cabecalho = (
    <CabecalhoGroov esquerda={{ icone: "arrow-back", onPress: voltarEtapa, rotulo: "Voltar" }} />
  );

  if (carregando) {
    return (
      <View className="flex-1 bg-background">
        {cabecalho}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#bc13fe" />
        </View>
      </View>
    );
  }

  if (publicado) {
    return (
      <View className="flex-1 bg-background">
        <CabecalhoGroov />
        <View className="flex-1 items-center justify-center gap-4 px-margin-mobile">
          <MaterialIcons name="check-circle" size={64} color="#10b981" />
          <Text className="font-headline-lg-mobile text-headline-lg-mobile text-white text-center">
            {edicao ? "Evento atualizado!" : "Evento publicado!"}
          </Text>
          <Text className="font-body-md text-body-md text-on-surface-variant text-center">
            {edicao
              ? "As alterações já aparecem para todo mundo."
              : "Você é o gerente deste evento: pode editar, montar a equipe e acompanhar tudo em Meus eventos."}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace({ pathname: "/detalhes", params: { id: publicado.id } })}
            className="mt-2 w-full bg-primary-container rounded-xl py-4 items-center"
          >
            <Text className="font-headline-md text-white text-[16px]">Ver evento</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/meus-eventos")}
            className="w-full rounded-xl py-4 items-center border border-primary-container"
          >
            <Text className="font-headline-md text-primary text-[16px]">Meus eventos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const inicio = lerDataHora(form.data, form.hora);
  const tags = listaDeTags(form.tags);

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {cabecalho}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: espacoNavBar + 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          {edicao ? "Editar evento" : "Publicar evento"}
        </Text>
        <Text className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Etapa {indice + 1} de {etapas.length} • {ETAPAS[etapa]}
        </Text>
        <View className="flex-row gap-1.5 mt-3 mb-6">
          {etapas.map((nome, i) => (
            <View
              key={nome}
              className={`flex-1 h-1.5 rounded-full ${i <= indice ? "bg-primary-container" : "bg-white/10"}`}
            />
          ))}
        </View>

        {etapa === 0 && (
          <View className="gap-4">
            <Campo rotulo="Título" valor={form.titulo} onChange={(v) => alterar("titulo", v)} maxLength={200} capitalizar="sentences" />
            <Campo
              rotulo="Descrição"
              valor={form.descricao}
              onChange={(v) => alterar("descricao", v)}
              multilinha
              maxLength={5000}
              capitalizar="sentences"
              placeholder="Conte o que vai rolar"
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Campo rotulo="Data de início" valor={form.data} onChange={(v) => alterar("data", mascararData(v))} placeholder="DD/MM/AAAA" teclado="numeric" />
              </View>
              <View className="w-28">
                <Campo rotulo="Hora" valor={form.hora} onChange={(v) => alterar("hora", mascararHora(v))} placeholder="HH:MM" teclado="numeric" />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Campo rotulo="Término (opcional)" valor={form.dataFim} onChange={(v) => alterar("dataFim", mascararData(v))} placeholder="DD/MM/AAAA" teclado="numeric" />
              </View>
              <View className="w-28">
                <Campo rotulo="Hora" valor={form.horaFim} onChange={(v) => alterar("horaFim", mascararHora(v))} placeholder="HH:MM" teclado="numeric" />
              </View>
            </View>
            <Campo
              rotulo="Selos (opcional)"
              valor={form.tags}
              onChange={(v) => alterar("tags", v)}
              placeholder="18+, open bar, ao ar livre"
              ajuda="Separe por vírgula. Até 8 selos."
            />
            <Campo
              rotulo="Foto de capa (opcional)"
              valor={form.imagemUrl}
              onChange={(v) => alterar("imagemUrl", v)}
              placeholder="https://..."
              teclado="url"
              ajuda="Cole o link de uma imagem. O envio direto da galeria chega em breve."
            />
          </View>
        )}

        {etapa === 1 && (
          <View className="gap-4">
            <Campo rotulo="Nome do local" valor={form.nomeLocal} onChange={(v) => alterar("nomeLocal", v)} maxLength={200} capitalizar="words" placeholder="Ex.: Marco Zero" />
            <Campo rotulo="Endereço (opcional)" valor={form.endereco} onChange={(v) => alterar("endereco", v)} maxLength={300} capitalizar="words" placeholder="Rua, número, bairro" />
            <Campo rotulo="Cidade" valor={form.cidade} onChange={(v) => alterar("cidade", v)} maxLength={100} capitalizar="words" placeholder="Recife" />
            <View className="gap-3">
              <Text className="font-body-md text-body-md text-on-surface">Local no mapa (opcional)</Text>
              <Text className="font-body-sm text-[12px] text-on-surface-variant">
                Toque no mapa para marcar o ponto exato. É assim que o evento aparece para quem busca perto de si.
              </Text>
              <SeletorPonto
                key={versaoMapa}
                ponto={form.latitude && form.longitude ? { lat: Number(form.latitude), lng: Number(form.longitude) } : null}
                onEscolher={(p) => setForm((atual) => ({ ...atual, latitude: p.lat.toFixed(6), longitude: p.lng.toFixed(6) }))}
              />
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={usarMinhaLocalizacao} className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 border border-primary-container">
                  <MaterialIcons name="my-location" size={18} color="#ebb2ff" />
                  <Text className="font-body-md text-primary">Usar onde estou</Text>
                </TouchableOpacity>
                {!!form.latitude && (
                  <TouchableOpacity
                    onPress={() => {
                      setForm((atual) => ({ ...atual, latitude: "", longitude: "" }));
                      setVersaoMapa((v) => v + 1);
                    }}
                    className="flex-row items-center justify-center gap-2 rounded-xl py-3 px-4 border border-white/20"
                  >
                    <Text className="font-body-md text-on-surface-variant">Limpar</Text>
                  </TouchableOpacity>
                )}
              </View>
              {!!avisoLocal && <Text className="font-body-sm text-body-sm text-error">{avisoLocal}</Text>}
            </View>
          </View>
        )}

        {etapa === 2 && (
          <View className="gap-4">
            <Text className="font-body-sm text-body-sm text-on-surface-variant">
              Adicione quem vai se apresentar. A foto é opcional e, se a atração tiver conta no Groov, marque o @ dela.
            </Text>
            {form.atracoes.map((a, i) => (
              <Secao key={a.chave} titulo={`Atração ${i + 1}`}>
                <Campo rotulo="Nome" valor={a.nome} onChange={(v) => alterarAtracao(a.chave, { nome: v })} maxLength={100} capitalizar="words" />
                <Campo rotulo="Foto (opcional)" valor={a.fotoUrl} onChange={(v) => alterarAtracao(a.chave, { fotoUrl: v })} placeholder="https://..." teclado="url" />
                <Campo rotulo="Conta no Groov (opcional)" valor={a.username} onChange={(v) => alterarAtracao(a.chave, { username: v })} placeholder="@usuario" />
                <TouchableOpacity
                  onPress={() => alterar("atracoes", form.atracoes.filter((x) => x.chave !== a.chave))}
                  className="flex-row items-center gap-1 self-start"
                >
                  <MaterialIcons name="delete-outline" size={18} color="#ffb4ab" />
                  <Text className="font-body-sm text-body-sm text-error">Remover</Text>
                </TouchableOpacity>
              </Secao>
            ))}
            <TouchableOpacity
              onPress={() => alterar("atracoes", [...form.atracoes, novaAtracao()])}
              className="flex-row items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary-container"
            >
              <MaterialIcons name="add" size={20} color="#ebb2ff" />
              <Text className="font-body-md text-primary">Adicionar atração</Text>
            </TouchableOpacity>
          </View>
        )}

        {etapa === 3 && (
          <View className="gap-4">
            <Text className="font-body-sm text-body-sm text-on-surface-variant">
              Defina os lotes de ingresso e os valores. Preço 0 vira ingresso grátis.
            </Text>
            {form.lotes.map((l, i) => (
              <Secao key={l.chave} titulo={l.nome.trim() || `Lote ${i + 1}`}>
                <Campo rotulo="Nome do lote" valor={l.nome} onChange={(v) => alterarLote(l.chave, { nome: v })} maxLength={100} capitalizar="sentences" placeholder="Pista, VIP, 1º lote..." />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Campo rotulo="Preço (R$)" valor={l.preco} onChange={(v) => alterarLote(l.chave, { preco: v })} teclado="decimal-pad" placeholder="50,00" />
                  </View>
                  <View className="flex-1">
                    <Campo rotulo="Quantidade" valor={l.quantidade} onChange={(v) => alterarLote(l.chave, { quantidade: v.replace(/\D/g, "") })} teclado="numeric" placeholder="100" />
                  </View>
                </View>
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-body-md text-body-md text-white">Compra em grupo</Text>
                    <Text className="font-body-sm text-[12px] text-on-surface-variant">Desconto para quem compra com amigos</Text>
                  </View>
                  <Switch value={l.grupo} onValueChange={(v) => alterarLote(l.chave, { grupo: v })} trackColor={{ true: "#bc13fe", false: "#504254" }} thumbColor="#ffffff" />
                </View>
                {l.grupo && (
                  <View className="gap-4">
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <Campo rotulo="Pessoas" valor={l.tamanhoGrupo} onChange={(v) => alterarLote(l.chave, { tamanhoGrupo: v.replace(/\D/g, "") })} teclado="numeric" />
                      </View>
                      <View className="flex-1">
                        <Campo rotulo="Desconto (%)" valor={l.descontoPct} onChange={(v) => alterarLote(l.chave, { descontoPct: v })} teclado="decimal-pad" />
                      </View>
                    </View>
                    <Campo rotulo="Prazo para o grupo pagar (horas)" valor={l.prazoHoras} onChange={(v) => alterarLote(l.chave, { prazoHoras: v.replace(/\D/g, "") })} teclado="numeric" />
                  </View>
                )}
                {form.lotes.length > 1 && (
                  <TouchableOpacity
                    onPress={() => alterar("lotes", form.lotes.filter((x) => x.chave !== l.chave))}
                    className="flex-row items-center gap-1 self-start"
                  >
                    <MaterialIcons name="delete-outline" size={18} color="#ffb4ab" />
                    <Text className="font-body-sm text-body-sm text-error">Remover lote</Text>
                  </TouchableOpacity>
                )}
              </Secao>
            ))}
            <TouchableOpacity
              onPress={() => alterar("lotes", [...form.lotes, novoLote(`${form.lotes.length + 1}º lote`)])}
              className="flex-row items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary-container"
            >
              <MaterialIcons name="add" size={20} color="#ebb2ff" />
              <Text className="font-body-md text-primary">Adicionar lote</Text>
            </TouchableOpacity>
          </View>
        )}

        {etapa === 4 && (
          <View className="gap-4">
            <Secao titulo="Evento">
              <Linha rotulo="Título" valor={form.titulo} />
              <Linha rotulo="Início" valor={inicio ? `${form.data} às ${form.hora}` : ""} />
              {!!form.dataFim && <Linha rotulo="Término" valor={`${form.dataFim} às ${form.horaFim}`} />}
              <Linha rotulo="Local" valor={[form.nomeLocal, form.cidade].filter(Boolean).join(" • ")} />
              {!!form.endereco && <Linha rotulo="Endereço" valor={form.endereco} />}
              {tags.length > 0 && <Linha rotulo="Selos" valor={tags.join(", ")} />}
            </Secao>
            <Secao titulo="Atrações">
              {form.atracoes.length === 0 ? (
                <Text className="font-body-sm text-body-sm text-on-surface-variant">Nenhuma atração informada.</Text>
              ) : (
                form.atracoes.map((a) => (
                  <Linha key={a.chave} rotulo={a.nome} valor={a.username ? `@${a.username.replace(/^@/, "")}` : "sem conta"} />
                ))
              )}
            </Secao>
            {!edicao && (
              <Secao titulo="Ingressos">
                {form.lotes.map((l) => (
                  <Linha
                    key={l.chave}
                    rotulo={l.nome}
                    valor={`${formatarReais(Number(lerPreco(l.preco) ?? 0))} • ${l.quantidade} un.${l.grupo ? ` • grupo de ${l.tamanhoGrupo}` : ""}`}
                  />
                ))}
              </Secao>
            )}
          </View>
        )}

        {!!erro && <Text className="font-body-sm text-body-sm text-error mt-4 text-center">{erro}</Text>}

        <View className="flex-row gap-3 mt-6">
          {etapa > 0 && (
            <TouchableOpacity onPress={voltarEtapa} className="flex-1 rounded-xl py-4 items-center border border-white/20">
              <Text className="font-headline-md text-white text-[16px]">Voltar</Text>
            </TouchableOpacity>
          )}
          {etapa < ultimaEtapa ? (
            <TouchableOpacity onPress={avancar} className="flex-1 bg-primary-container rounded-xl py-4 items-center">
              <Text className="font-headline-md text-white text-[16px]">Continuar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={publicar}
              disabled={enviando}
              className="flex-1 bg-primary-container rounded-xl py-4 items-center"
              style={{ opacity: enviando ? 0.6 : 1 }}
            >
              {enviando ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="font-headline-md text-white text-[16px]">{edicao ? "Salvar alterações" : "Publicar evento"}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
