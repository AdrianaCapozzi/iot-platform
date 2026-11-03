
from pathlib import Path
import re

import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go


# ============================================================
# CONFIGURAÇÃO
# ============================================================

st.set_page_config(
    page_title="EcoSense | Painel Ambiental",
    layout="wide",
    initial_sidebar_state="expanded"
)

BASE_DIR = Path(__file__).resolve().parents[2]
PASTA_DADOS = BASE_DIR / "analytics" / "outputs"

ARQUIVO_CIDADES = PASTA_DADOS / "cidades.csv"
ARQUIVO_SENSORES = PASTA_DADOS / "sensores.csv"

FUNDO = "#101A18"
PAINEL = "#192824"
VERDE = "#35C99A"
TEXTO = "#E8F2EE"
CINZA = "#A9B9B2"


# ============================================================
# ESTILO VISUAL
# ============================================================

st.markdown("""
<style>
    .stApp {
        background-color: #101A18;
        color: #E8F2EE;
    }

    [data-testid="stSidebar"] {
        background-color: #192824;
    }

    h1, h2, h3 {
        color: #E8F2EE;
    }

    div[data-testid="stMetric"] {
        background-color: #192824;
        border: 1px solid #29483E;
        padding: 16px;
        border-radius: 12px;
    }

    div[data-testid="stMetricValue"] {
        color: #35C99A;
    }

    .cabecalho {
        background: linear-gradient(110deg, #173B32, #236B53, #35A982);
        padding: 28px;
        border-radius: 16px;
        margin-bottom: 22px;
    }

    .cabecalho h1 {
        color: white;
        margin-bottom: 5px;
    }

    .cabecalho p {
        color: #E8F2EE;
        margin-bottom: 0;
    }

    .secao {
        padding-top: 12px;
        padding-bottom: 4px;
    }

    footer {
        visibility: hidden;
    }
</style>
""", unsafe_allow_html=True)


# ============================================================
# LEITURA DOS ARQUIVOS
# ============================================================

@st.cache_data
def carregar_dados():
    cidades = pd.read_csv(
        ARQUIVO_CIDADES,
        encoding="utf-8-sig"
    )

    sensores = pd.read_csv(
        ARQUIVO_SENSORES,
        encoding="utf-8-sig"
    )

    return cidades, sensores


cidades, sensores = carregar_dados()

# Padronização dos nomes das colunas
cidades.columns = cidades.columns.str.strip()
sensores.columns = sensores.columns.str.strip()

# Conversão dos campos numéricos das cidades
colunas_numericas = [
    "lat", "lon", "sensor_count",
    "temperature", "humidity",
    "pm25", "pm10", "wind_speed",
    "icaud_score", "icaud_min", "icaud_max",
    "cmp_temperature", "cmp_humidity",
    "cmp_airQuality", "cmp_wind",
    "w_temperature", "w_humidity",
    "w_airQuality", "w_wind"
]

for coluna in colunas_numericas:
    if coluna in cidades.columns:
        cidades[coluna] = pd.to_numeric(
            cidades[coluna],
            errors="coerce"
        )

# Conversão dos campos de texto
for coluna in ["name", "country", "icaud_class"]:
    if coluna in cidades.columns:
        cidades[coluna] = cidades[coluna].fillna("Não informado").astype(str)

for coluna in ["source", "device_type", "provides", "name"]:
    if coluna in sensores.columns:
        sensores[coluna] = sensores[coluna].fillna("Não informado").astype(str)

# Identificação da cidade de cada sensor
if "city_id" in sensores.columns and "id" in cidades.columns:
    mapa_cidades = cidades[["id", "name"]].drop_duplicates()
    sensores = sensores.merge(
        mapa_cidades,
        left_on="city_id",
        right_on="id",
        how="left",
        suffixes=("", "_cidade")
    )

    if "name_cidade" in sensores.columns:
        sensores["cidade"] = sensores["name_cidade"]
    else:
        sensores["cidade"] = sensores["name"]

    sensores["cidade"] = sensores["cidade"].fillna("Cidade não identificada")


# ============================================================
# CABEÇALHO
# ============================================================

st.markdown("""
<div class="cabecalho">
    <h1>EcoSense | Inteligência Ambiental</h1>
    <p>
        Análise de indicadores ambientais, qualidade do ar
        e monitoramento de sensores urbanos.
    </p>
</div>
""", unsafe_allow_html=True)


# ============================================================
# FILTROS
# ============================================================

st.sidebar.title("Filtros de análise")

paises = sorted(cidades["country"].dropna().unique().tolist())
classes = sorted(cidades["icaud_class"].dropna().unique().tolist())

paises_selecionados = st.sidebar.multiselect(
    "País",
    paises,
    default=paises
)

classes_selecionadas = st.sidebar.multiselect(
    "Classificação ICAU-D",
    classes,
    default=classes
)

df = cidades.copy()

if paises_selecionados:
    df = df[df["country"].isin(paises_selecionados)]

if classes_selecionadas:
    df = df[df["icaud_class"].isin(classes_selecionadas)]

# Aplicação do filtro de cidades aos sensores
if "cidade" in sensores.columns:
    cidades_filtradas = df["name"].dropna().unique().tolist()
    sensores_df = sensores[sensores["cidade"].isin(cidades_filtradas)].copy()
else:
    sensores_df = sensores.copy()

st.sidebar.markdown("---")
st.sidebar.caption("Os gráficos são atualizados conforme os filtros selecionados.")


# ============================================================
# INDICADORES PRINCIPAIS
# ============================================================

st.markdown('<div class="secao"></div>', unsafe_allow_html=True)
st.subheader("Visão geral")

total_cidades = len(df)

total_sensores = (
    int(df["sensor_count"].fillna(0).sum())
    if "sensor_count" in df.columns else len(sensores_df)
)

media_icaud = (
    df["icaud_score"].mean()
    if "icaud_score" in df.columns else np.nan
)

media_pm25 = (
    df["pm25"].mean()
    if "pm25" in df.columns else np.nan
)

media_temperatura = (
    df["temperature"].mean()
    if "temperature" in df.columns else np.nan
)

media_umidade = (
    df["humidity"].mean()
    if "humidity" in df.columns else np.nan
)

k1, k2, k3, k4 = st.columns(4)

k1.metric("Cidades analisadas", f"{total_cidades:,}".replace(",", "."))
k2.metric("Sensores cadastrados", f"{total_sensores:,}".replace(",", "."))
k3.metric(
    "ICAU-D médio",
    f"{media_icaud:.1f}" if pd.notna(media_icaud) else "—"
)
k4.metric(
    "PM2.5 médio",
    f"{media_pm25:.1f}" if pd.notna(media_pm25) else "—"
)

k5, k6 = st.columns(2)

k5.metric(
    "Temperatura média",
    f"{media_temperatura:.1f} °C" if pd.notna(media_temperatura) else "—"
)

k6.metric(
    "Umidade média",
    f"{media_umidade:.1f}%" if pd.notna(media_umidade) else "—"
)


# ============================================================
# QUALIDADE DO AR E ICAU-D
# ============================================================

st.markdown("---")
st.subheader("Qualidade do ar e conforto ambiental")

esquerda, direita = st.columns(2)

with esquerda:
    if {"name", "pm25"}.issubset(df.columns):
        ranking_pm25 = (
            df[["name", "pm25"]]
            .dropna()
            .sort_values("pm25", ascending=False)
            .head(10)
            .sort_values("pm25", ascending=True)
        )

        fig = px.bar(
            ranking_pm25,
            x="pm25",
            y="name",
            orientation="h",
            title="10 cidades com maiores concentrações de PM2.5",
            labels={
                "pm25": "PM2.5",
                "name": "Cidade"
            },
            color="pm25",
            color_continuous_scale="YlOrRd"
        )

        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor=PAINEL,
            plot_bgcolor=PAINEL,
            coloraxis_showscale=False,
            yaxis_title=""
        )

        st.plotly_chart(fig, use_container_width=True)

with direita:
    if {"name", "icaud_score"}.issubset(df.columns):
        ranking_icaud = (
            df[["name", "icaud_score"]]
            .dropna()
            .sort_values("icaud_score", ascending=False)
            .head(10)
            .sort_values("icaud_score", ascending=True)
        )

        fig = px.bar(
            ranking_icaud,
            x="icaud_score",
            y="name",
            orientation="h",
            title="10 cidades com maiores índices ICAU-D",
            labels={
                "icaud_score": "ICAU-D",
                "name": "Cidade"
            },
            color="icaud_score",
            color_continuous_scale="Greens"
        )

        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor=PAINEL,
            plot_bgcolor=PAINEL,
            coloraxis_showscale=False,
            yaxis_title=""
        )

        st.plotly_chart(fig, use_container_width=True)


# ============================================================
# DISTRIBUIÇÃO DAS CLASSIFICAÇÕES
# ============================================================

st.markdown("---")
st.subheader("Distribuição das condições ambientais")

esquerda, direita = st.columns(2)

with esquerda:
    if "icaud_class" in df.columns and not df.empty:
        distribuicao = (
            df["icaud_class"]
            .value_counts()
            .rename_axis("Classificação")
            .reset_index(name="Quantidade")
        )

        fig = px.pie(
            distribuicao,
            names="Classificação",
            values="Quantidade",
            hole=0.55,
            title="Cidades por classificação ICAU-D"
        )

        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor=PAINEL
        )

        st.plotly_chart(fig, use_container_width=True)

with direita:
    if {"name", "temperature"}.issubset(df.columns):
        temperatura = (
            df[["name", "temperature"]]
            .dropna()
            .sort_values("temperature", ascending=False)
            .head(10)
            .sort_values("temperature", ascending=True)
        )

        fig = px.bar(
            temperatura,
            x="temperature",
            y="name",
            orientation="h",
            title="10 cidades com maiores temperaturas",
            labels={
                "temperature": "Temperatura (°C)",
                "name": "Cidade"
            },
            color="temperature",
            color_continuous_scale="Oranges"
        )

        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor=PAINEL,
            plot_bgcolor=PAINEL,
            coloraxis_showscale=False,
            yaxis_title=""
        )

        st.plotly_chart(fig, use_container_width=True)


# ============================================================
# RELAÇÃO ENTRE PM2.5 E ICAU-D
# ============================================================

st.markdown("---")
st.subheader("Relação entre poluição atmosférica e ICAU-D")

if {"pm25", "icaud_score", "name", "icaud_class"}.issubset(df.columns):
    dispersao = df[
        ["name", "pm25", "icaud_score", "icaud_class"]
    ].dropna()

    if not dispersao.empty:
        fig = px.scatter(
            dispersao,
            x="pm25",
            y="icaud_score",
            color="icaud_class",
            hover_name="name",
            size_max=14,
            title="Concentração de PM2.5 e pontuação ICAU-D",
            labels={
                "pm25": "PM2.5",
                "icaud_score": "Pontuação ICAU-D",
                "icaud_class": "Classificação"
            }
        )

        fig.update_traces(marker={"size": 12, "opacity": 0.8})

        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor=PAINEL,
            plot_bgcolor=PAINEL
        )

        st.plotly_chart(fig, use_container_width=True)


# ============================================================
# MATRIZ DE CORRELAÇÃO
# ============================================================

st.markdown("---")
st.subheader("Correlação entre indicadores ambientais")

variaveis_correlacao = [
    "temperature",
    "humidity",
    "pm25",
    "pm10",
    "wind_speed",
    "icaud_score"
]

variaveis_disponiveis = [
    coluna for coluna in variaveis_correlacao
    if coluna in df.columns and df[coluna].notna().sum() > 1
]

if len(variaveis_disponiveis) >= 2:
    matriz = df[variaveis_disponiveis].corr(numeric_only=True)

    nomes = {
        "temperature": "Temperatura",
        "humidity": "Umidade",
        "pm25": "PM2.5",
        "pm10": "PM10",
        "wind_speed": "Vento",
        "icaud_score": "ICAU-D"
    }

    matriz.index = [nomes.get(x, x) for x in matriz.index]
    matriz.columns = [nomes.get(x, x) for x in matriz.columns]

    fig = go.Figure(
        data=go.Heatmap(
            z=matriz.values,
            x=matriz.columns,
            y=matriz.index,
            colorscale="RdBu",
            zmin=-1,
            zmax=1,
            text=np.round(matriz.values, 2),
            texttemplate="%{text}",
            colorbar={"title": "Correlação"}
        )
    )

    fig.update_layout(
        title="Matriz de correlação de Pearson",
        template="plotly_dark",
        paper_bgcolor=PAINEL,
        height=480
    )

    st.plotly_chart(fig, use_container_width=True)


# ============================================================
# COMPONENTES DO ICAU-D
# ============================================================

st.markdown("---")
st.subheader("Composição do índice ICAU-D")

componentes = {
    "Temperatura": "cmp_temperature",
    "Umidade": "cmp_humidity",
    "Qualidade do ar": "cmp_airQuality",
    "Vento": "cmp_wind"
}

componentes_disponiveis = [
    nome for nome, coluna in componentes.items()
    if coluna in df.columns
]

if componentes_disponiveis:
    dados_componentes = []

    for nome, coluna in componentes.items():
        if coluna in df.columns:
            dados_componentes.append({
                "Componente": nome,
                "Pontuação média": df[coluna].mean()
            })

    componentes_df = pd.DataFrame(dados_componentes).dropna()

    if not componentes_df.empty:
        fig = px.bar(
            componentes_df,
            x="Componente",
            y="Pontuação média",
            color="Pontuação média",
            title="Pontuação média dos componentes do ICAU-D",
            color_continuous_scale="Teal"
        )

        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor=PAINEL,
            plot_bgcolor=PAINEL,
            coloraxis_showscale=False
        )

        st.plotly_chart(fig, use_container_width=True)


# ============================================================
# ANÁLISE DOS SENSORES
# ============================================================

st.markdown("---")
st.subheader("Monitoramento e distribuição dos sensores")

s1, s2 = st.columns(2)

with s1:
    if "source" in sensores_df.columns and not sensores_df.empty:
        fontes = (
            sensores_df["source"]
            .value_counts()
            .rename_axis("Fonte")
            .reset_index(name="Quantidade")
        )

        fig = px.bar(
            fontes,
            x="Quantidade",
            y="Fonte",
            orientation="h",
            title="Sensores por fonte de dados",
            color="Quantidade",
            color_continuous_scale="Teal"
        )

        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor=PAINEL,
            plot_bgcolor=PAINEL,
            coloraxis_showscale=False
        )

        st.plotly_chart(fig, use_container_width=True)

with s2:
    if "device_type" in sensores_df.columns and not sensores_df.empty:
        tipos = (
            sensores_df["device_type"]
            .value_counts()
            .rename_axis("Tipo de dispositivo")
            .reset_index(name="Quantidade")
        )

        fig = px.pie(
            tipos,
            names="Tipo de dispositivo",
            values="Quantidade",
            hole=0.5,
            title="Sensores por tipo de dispositivo"
        )

        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor=PAINEL
        )

        st.plotly_chart(fig, use_container_width=True)


# ============================================================
# VARIÁVEIS FORNECIDAS PELOS SENSORES
# ============================================================

st.markdown("---")
st.subheader("Variáveis monitoradas pelos sensores")

if "provides" in sensores_df.columns and not sensores_df.empty:
    lista_variaveis = []

    for valor in sensores_df["provides"].dropna():
        itens = re.split(r"[,;|]", str(valor))

        for item in itens:
            item = item.strip()

            if item and item.lower() not in ["nan", "none"]:
                lista_variaveis.append(item)

    if lista_variaveis:
        variaveis_df = (
            pd.Series(lista_variaveis)
            .value_counts()
            .rename_axis("Variável")
            .reset_index(name="Quantidade de registros")
        )

        fig = px.bar(
            variaveis_df,
            x="Quantidade de registros",
            y="Variável",
            orientation="h",
            title="Frequência das variáveis disponibilizadas",
            color="Quantidade de registros",
            color_continuous_scale="Greens"
        )

        fig.update_layout(
            template="plotly_dark",
            paper_bgcolor=PAINEL,
            plot_bgcolor=PAINEL,
            coloraxis_showscale=False
        )

        st.plotly_chart(fig, use_container_width=True)


# ============================================================
# MAPA DAS CIDADES
# ============================================================

st.markdown("---")
st.subheader("Distribuição geográfica das cidades monitoradas")

colunas_mapa = ["name", "lat", "lon", "icaud_score", "icaud_class"]

if all(coluna in df.columns for coluna in colunas_mapa):
    mapa = df[colunas_mapa].dropna(subset=["lat", "lon"])

    if not mapa.empty:
        fig = px.scatter_mapbox(
            mapa,
            lat="lat",
            lon="lon",
            color="icaud_score",
            size="icaud_score",
            hover_name="name",
            hover_data={
                "icaud_class": True,
                "icaud_score": True,
                "lat": False,
                "lon": False
            },
            color_continuous_scale="RdYlGn",
            size_max=18,
            zoom=1,
            title="Localização das cidades e pontuação ICAU-D"
        )

        fig.update_layout(
            mapbox_style="carto-darkmatter",
            mapbox_zoom=1,
            mapbox_center={
                "lat": float(mapa["lat"].mean()),
                "lon": float(mapa["lon"].mean())
            },
            template="plotly_dark",
            paper_bgcolor=PAINEL,
            margin={"r": 0, "t": 50, "l": 0, "b": 0},
            height=550
        )

        st.plotly_chart(fig, use_container_width=True)


# ============================================================
# TABELA DE CIDADES
# ============================================================

st.markdown("---")
st.subheader("Dados das cidades")

colunas_exibicao = [
    "name",
    "country",
    "sensor_count",
    "temperature",
    "humidity",
    "pm25",
    "pm10",
    "wind_speed",
    "icaud_score",
    "icaud_class"
]

colunas_exibicao = [
    coluna for coluna in colunas_exibicao
    if coluna in df.columns
]

st.dataframe(
    df[colunas_exibicao].sort_values(
        by="icaud_score",
        ascending=False
    ) if "icaud_score" in colunas_exibicao else df[colunas_exibicao],
    use_container_width=True,
    hide_index=True
)


# ============================================================
# TABELA DE SENSORES
# ============================================================

st.markdown("---")
st.subheader("Inventário de sensores")

colunas_sensores = [
    "cidade",
    "sensor_id",
    "name",
    "source",
    "device_type",
    "last_seen",
    "provides"
]

colunas_sensores = [
    coluna for coluna in colunas_sensores
    if coluna in sensores_df.columns
]

st.dataframe(
    sensores_df[colunas_sensores],
    use_container_width=True,
    hide_index=True
)


# ============================================================
# EXPORTAÇÃO
# ============================================================

st.markdown("---")
st.subheader("Exportar dados")

e1, e2 = st.columns(2)

with e1:
    st.download_button(
        label="Baixar cidades filtradas (CSV)",
        data=df.to_csv(index=False).encode("utf-8-sig"),
        file_name="ecosense_cidades_filtradas.csv",
        mime="text/csv",
        use_container_width=True
    )

with e2:
    st.download_button(
        label="Baixar sensores filtrados (CSV)",
        data=sensores_df.to_csv(index=False).encode("utf-8-sig"),
        file_name="ecosense_sensores_filtrados.csv",
        mime="text/csv",
        use_container_width=True
    )


# ============================================================
# RODAPÉ
# ============================================================

st.markdown("---")

st.markdown("""
<div style="text-align:center; color:#A9B9B2; padding:18px;">
    <strong>EcoSense</strong> | Inteligência Ambiental<br>
    Análise de dados ambientais e indicadores urbanos
</div>
""", unsafe_allow_html=True)
