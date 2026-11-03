
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Carregar os dados das cidades
df = pd.read_csv("cidades.csv")

# Variáveis utilizadas na análise
variaveis = [
    "temperature",
    "humidity",
    "pm25",
    "pm10",
    "windSpeed",
    "icaud"
]

# Selecionar somente as colunas existentes
colunas = [col for col in variaveis if col in df.columns]
dados = df[colunas].apply(pd.to_numeric, errors="coerce")

# Calcular a matriz de correlação
correlacao = dados.corr(method="pearson")

# Gerar o mapa de calor
plt.figure(figsize=(10, 8))

sns.heatmap(
    correlacao,
    annot=True,
    cmap="coolwarm",
    vmin=-1,
    vmax=1,
    center=0,
    fmt=".2f"
)

plt.title("EcoSense — Matriz de Correlação Ambiental")
plt.tight_layout()

# Salvar a imagem
plt.savefig(
    "analytics/outputs/matriz_correlacao.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()
