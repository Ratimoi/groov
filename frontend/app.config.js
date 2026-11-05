// Complementa o app.json. O runtime do OTA fica preso aos dois primeiros números da versão
// (1.5.0, 1.5.1, 1.5.2... usam o runtime "1.5.0"): subir só o último número recebe atualização
// normalmente. O runtime muda quando o número do meio (ou o primeiro) sobe, que é quando se gera
// um APK novo com código nativo novo.
module.exports = ({ config }) => {
  const [maior, meio] = String(config.version).split(".");
  return { ...config, runtimeVersion: `${maior}.${meio}.0` };
};
