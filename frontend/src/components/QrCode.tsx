import { useMemo } from "react";
import { View } from "react-native";
import gerarQr from "qrcode-generator";

type Props = { valor: string; tamanho?: number };

// QR code desenhado com Views, em JS puro: não depende de módulo nativo, então chega
// também por atualização OTA a quem tem um APK antigo.
export function QrCode({ valor, tamanho = 200 }: Props) {
  const linhas = useMemo(() => {
    const qr = gerarQr(0, "M");
    qr.addData(valor);
    qr.make();
    const total = qr.getModuleCount();
    return Array.from({ length: total }, (_, linha) =>
      Array.from({ length: total }, (_, coluna) => qr.isDark(linha, coluna)),
    );
  }, [valor]);

  const lado = tamanho / linhas.length;

  return (
    <View
      accessibilityLabel="QR code do ingresso"
      style={{ width: tamanho, height: tamanho, backgroundColor: "#ffffff" }}
    >
      {linhas.map((linha, indiceLinha) => (
        <View key={indiceLinha} style={{ flexDirection: "row", height: lado }}>
          {linha.map((escuro, indiceColuna) => (
            <View key={indiceColuna} style={{ width: lado, height: lado, backgroundColor: escuro ? "#000000" : "#ffffff" }} />
          ))}
        </View>
      ))}
    </View>
  );
}
