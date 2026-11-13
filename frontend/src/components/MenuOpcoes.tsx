import { useRef, useState, type ComponentRef } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export type OpcaoMenu = {
  rotulo: string;
  icone: React.ComponentProps<typeof MaterialIcons>["name"];
  onPress: () => void;
  destrutiva?: boolean;
  desabilitada?: boolean;
};

type Props = { opcoes: OpcaoMenu[]; rotulo?: string };

const LARGURA_MENU = 200;
const FOLGA = 4;

// Botão "…" que abre um menu suspenso preso a ele. O menu fica num Modal transparente para não
// ser cortado pelo card nem ficar atrás dos cards seguintes dentro de um ScrollView.
export function MenuOpcoes({ opcoes, rotulo = "Mais opções" }: Props) {
  const botao = useRef<ComponentRef<typeof TouchableOpacity>>(null);
  const { width: larguraTela } = useWindowDimensions();
  const [posicao, setPosicao] = useState<{ top: number; right: number } | null>(null);

  const abrir = () =>
    botao.current?.measureInWindow((x, y, largura, altura) =>
      setPosicao({ top: y + altura + FOLGA, right: Math.max(8, larguraTela - (x + largura)) }),
    );
  const fechar = () => setPosicao(null);

  return (
    <>
      <TouchableOpacity
        ref={botao}
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        hitSlop={8}
        className="h-8 w-8 items-center justify-center rounded-full"
      >
        <MaterialIcons name="more-horiz" size={22} color="#d4c0d7" />
      </TouchableOpacity>

      <Modal visible={posicao !== null} transparent animationType="fade" onRequestClose={fechar}>
        <Pressable onPress={fechar} accessibilityLabel="Fechar menu" className="flex-1">
          {posicao && (
            <View
              className="absolute bg-surface-container-high border border-white/10 rounded-xl py-1 overflow-hidden"
              style={{ top: posicao.top, right: posicao.right, width: LARGURA_MENU, elevation: 8 }}
            >
              {opcoes.map((opcao) => (
                <TouchableOpacity
                  key={opcao.rotulo}
                  disabled={opcao.desabilitada}
                  onPress={() => {
                    fechar();
                    opcao.onPress();
                  }}
                  accessibilityRole="menuitem"
                  className="flex-row items-center gap-3 px-4 py-3"
                  style={{ opacity: opcao.desabilitada ? 0.4 : 1 }}
                >
                  <MaterialIcons name={opcao.icone} size={18} color={opcao.destrutiva ? "#ffb4ab" : "#ebb2ff"} />
                  <Text className={`font-body-md text-body-md ${opcao.destrutiva ? "text-error" : "text-on-surface"}`}>
                    {opcao.rotulo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}
