
# ============================================================
# EcoSense | Dashboard de Inteligência Ambiental
# Projeto Integrador - Análise de Dados
# ============================================================

import os
import re
import warnings

import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.express as px

warnings.filterwarnings("ignore")

# ------------------------------------------------------------
# CONFIGURAÇÃO DA PÁGINA
# ------------------------------------------------------------

st.set_page_config(
    page_title="EcoSense | Inteligência Ambiental",
    page_icon="🌱",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ------------------------------------------------------------
# IDENTIDADE VISUAL
# ------------------------------------------------------------

COR_PRINCIPAL = "#147D64"
COR_SECUNDARIA = "#38A58C"
COR_DESTAQUE = "#E8A838"
COR_FUNDO = "#F4F7F6"

st.markdown("""
<style>
    .stApp {
        background-color: #F4F7F6;
    }
    h1, h2, h3 {
        color: #147D64;
    }
    [data-testid="stMetric"] {
        background-color: white;
        border: 1px solid #DCE7E2;
        padding: 15px;
        border-radius: 10px;
    }
    section[data-testid="stSidebar"] {
        background-color: #E5EFEA;
    }
</style>
""", unsafe_allow_html=True)


# ------------------------------------------------------------
# LOCALIZAÇÃO DOS ARQUIVOS
# ------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__)
)))

CAMINHO_CIDADES = os.path.join(BASE_DIR, "cidades.csv")

# Alternativa caso o CSV esteja na pasta analytics/outputs
if not os.path.exists(CAMINHO_CIDADES):
    CAMINHO_CIDADES = os.path.join(
        BASE_DIR, "analytics", "outputs", "cidades.csv"
    )


# ------------------------------------------------------------
# FUNÇÕES AUXILIARES
# ------------------------------------------------------------

def normalizar_nome(nome):
    """Padroniza nomes de colunas para facilitar o reconhecimento."""
    nome = str(nome).strip().lower()
    nome = re.sub(r"[^a-z0-9]", "", nome)
    return nome


def localizar_coluna(df, alternativas):
    """Localiza uma coluna a partir de possíveis nomes equivalentes."""
    mapa = {normalizar_nome(col): col for col in df.columns}

    for alternativa in alternativas:
        chave = normalizar_nome(alternativa)
        if chave in mapa:
            return mapa[chave]

    return None


def converter_numericas(df, colunas):
    """Converte as colunas selecionadas para formato numérico."""
    for coluna in colunas:
        if coluna and coluna in df.columns:
            df[coluna] = pd.to_numeric(df[coluna], errors="coerce")
    return df


# ------------------------------------------------------------
# CARREGAMENTO DOS DADOS
# ------------------------------------------------------------

@st.cache_data
def carregar_dados(caminho):
    return pd.read_csv(caminho)


if not os.path.exists(CAMINHO_CIDADES):
    st.error("Arquivo cidades.csv não encontrado.")
    st.info(
        "Coloque cidades.csv na raiz do projeto "
        "ou em analytics/outputs/."
    )
    st.stop()

df_original = carregar_dados(CAMINHO_CIDADES)
df = df_original.copy()


# ------------------------------------------------------------
# RECONHECIMENTO AUTOMÁTICO DAS COLUNAS
# Ajuste as alternativas caso seu CSV use outros nomes.
# ------------------------------------------------------------

COL_CIDADE = localizar_coluna(
    df, ["name", "city", "cidade", "city_name", "nome"]
)

COL_PAIS = localizar_coluna(
    df, ["country", "pais", "country_code"]
)

COL_TEMP = localizar_coluna(
    df, ["temperature", "temp", "temperatura", "temperature_c"]
)

COL_UMIDADE = localizar_coluna(
    df, ["humidity", "umidade", "relative_humidity"]
)

COL_PM25 = localizar_coluna(
    df, ["pm25", "pm2_5", "pm2.5", "particulate_matter_2_5"]
)

COL_PM10 = localizar_coluna(
    df, ["pm10", "particulate_matter_10"]
)

COL_VENTO = localizar_coluna(
    df, ["windspeed", "wind_speed", "velocidade_vento", "wind"]
)

COL_ICAUD = localizar_coluna(
    df, ["icaud", "indice", "comfort_index", "environmental_index"]
)

COL_CLASSIFICACAO = localizar_coluna(
    df, ["classification", "classificacao", "comfort_level", "category"]
)


COLUNAS_METRICAS = [
    COL_TEMP,
    COL_UMIDADE,
    COL_PM25,
    COL_PM10,
    COL_VENTO,
    COL_ICAUD
]

df = converter_numericas(df, COLUNAS_METRICAS)

# Nomes amigáveis para visualização
NOMES_METRICAS = {
    COL_TEMP: "Temperatura (°C)",
    COL_UMIDADE: "Umidade (%)",
    COL_PM25: "PM2.5",
    COL_PM10: "PM10",
    COL_VENTO: "Velocidade do vento",
    COL_ICAUD: "ICAU-D"
}

METRICAS_DISPONIVEIS = [
    col for col in COLUNAS_METRICAS
    if col is not None and col in df.columns
]


# ------------------------------------------------------------
# CABEÇALHO
# ------------------------------------------------------------

st.title("🌱 EcoSense")
st.subheader("Dashboard de Inteligência Ambiental")
st.caption(
    "Análise exploratória de indicadores ambientais, "
    "qualidade do ar e conforto urbano."
)

st.divider()


# ------------------------------------------------------------
# FILTROS LATERAIS
# ------------------------------------------------------------

st.sidebar.header("🔎 Filtros")

df_filtrado = df.copy()

if COL_PAIS:
    paises = sorted(
        df[COL_PAIS].dropna().astype(str).unique().tolist()
    )

    pais_selecionado = st.sidebar.multiselect(
        "País",
        options=paises,
        default=paises
    )

    df_filtrado = df_filtrado[
        df_filtrado[COL_PAIS].astype(str).isin(pais_selecionado)
    ]

if COL_CIDADE:
    cidades = sorted(
        df_filtrado[COL_CIDADE].dropna().astype(str).unique().tolist()
    )

    cidades_selecionadas = st.sidebar.multiselect(
        "Cidades",
        options=cidades,
        default=cidades
    )

    df_filtrado = df_filtrado[
        df_filtrado[COL_CIDADE].astype(str).isin(cidades_selecionadas)
    ]

if COL_CLASSIFICACAO:
    classificacoes = sorted(
        df_filtrado[COL_CLASSIFICACAO]
        .dropna().astype(str).unique().tolist()
    )

    classes_selecionadas = st.sidebar.multiselect(
        "Classificação ambiental",
        options=classificacoes,
        default=classificacoes
    )

    df_filtrado = df_filtrado[
        df_filtrado[COL_CLASSIFICACAO]
        .astype(str).isin(classes_selecionadas)
    ]

st.sidebar.caption(
    "Os filtros são aplicados aos indicadores e gráficos."
)


# ------------------------------------------------------------
# INDICADORES GERAIS
# ------------------------------------------------------------

st.header("📊 Indicadores gerais")

col1, col2, col3, col4 = st.columns(4)

quantidade_cidades = (
    df_filtrado[COL_CIDADE].nunique()
    if COL_CIDADE else len(df_filtrado)
)

quantidade_registros = len(df_filtrado)

media_icaud = (
    df_filtrado[COL_ICAUD].mean()
    if COL_ICAUD else np.nan
)

media_pm25 = (
    df_filtrado[COL_PM25].mean()
    if COL_PM25 else np.nan
)

col1.metric("Cidades analisadas", f"{quantidade_cidades:,}")
col2.metric("Registros", f"{quantidade_registros:,}")

col3.metric(
    "ICAU-D médio",
    f"{media_icaud:.2f}" if pd.notna(media_icaud) else "N/D"
)

col4.metric(
    "PM2.5 médio",
    f"{media_pm25:.2f}" if pd.notna(media_pm25) else "N/D"
)

st.divider()


# ------------------------------------------------------------
# DISTRIBUIÇÃO DO ICAU-D
# ------------------------------------------------------------

if COL_ICAUD:
    st.header("🌿 Distribuição do ICAU-D")

    col_hist, col_box = st.columns(2)

    with col_hist:
        fig_hist = px.histogram(
            df_filtrado,
            x=COL_ICAUD,
            nbins=20,
            title="Distribuição dos valores do ICAU-D",
            labels={COL_ICAUD: "ICAU-D"},
            color_discrete_sequence=[COR_PRINCIPAL]
        )

        fig_hist.update_layout(
            template="plotly_white",
            height=400
        )

        st.plotly_chart(fig_hist, use_container_width=True)

    with col_box:
        fig_box = px.box(
            df_filtrado,
            y=COL_ICAUD,
            points="all",
            title="Dispersão e valores extremos do ICAU-D",
            labels={COL_ICAUD: "ICAU-D"},
            color_discrete_sequence=[COR_SECUNDARIA]
        )

        fig_box.update_layout(
            template="plotly_white",
            height=400
        )

        st.plotly_chart(fig_box, use_container_width=True)


# ------------------------------------------------------------
# RANKING DAS CIDADES
# ------------------------------------------------------------

if COL_CIDADE and COL_ICAUD:
    st.header("🏆 Ranking de cidades por ICAU-D")

    ranking = (
        df_filtrado[[COL_CIDADE, COL_ICAUD]]
        .dropna()
        .sort_values(COL_ICAUD, ascending=False)
        .drop_duplicates(subset=[COL_CIDADE])
    )

    col_top, col_bottom = st.columns(2)

    with col_top:
        top_10 = ranking.head(10).sort_values(COL_ICAUD)

        fig_top = px.bar(
            top_10,
            x=COL_ICAUD,
            y=COL_CIDADE,
            orientation="h",
            title="10 cidades com maiores valores de ICAU-D",
            labels={
                COL_ICAUD: "ICAU-D",
                COL_CIDADE: "Cidade"
            },
            color=COL_ICAUD,
            color_continuous_scale="Greens"
        )

        fig_top.update_layout(
            template="plotly_white",
            height=500
        )

        st.plotly_chart(fig_top, use_container_width=True)

    with col_bottom:
        bottom_10 = ranking.tail(10)

        fig_bottom = px.bar(
            bottom_10,
            x=COL_ICAUD,
            y=COL_CIDADE,
            orientation="h",
            title="10 cidades com menores valores de ICAU-D",
            labels={
                COL_ICAUD: "ICAU-D",
                COL_CIDADE: "Cidade"
            },
            color=COL_ICAUD,
            color_continuous_scale="Reds_r"
        )

        fig_bottom.update_layout(
            template="plotly_white",
            height=500
        )

        st.plotly_chart(fig_bottom, use_container_width=True)


# ------------------------------------------------------------
# MAPA DE CALOR DE CORRELAÇÃO
# ------------------------------------------------------------

if len(METRICAS_DISPONIVEIS) >= 2:
    st.header("🔥 Matriz de correlação")

    st.markdown(
        "A matriz apresenta a intensidade e a direção "
        "das relações lineares entre as variáveis selecionadas."
    )

    dados_correlacao = df_filtrado[METRICAS_DISPONIVEIS].copy()

    # Remover colunas sem variação
    dados_correlacao = dados_correlacao.loc[
        :, dados_correlacao.nunique() > 1
    ]

    if dados_correlacao.shape[1] >= 2:
        correlacao = dados_correlacao.corr(method="pearson")

        # Substituir nomes técnicos por nomes amigáveis
        correlacao = correlacao.rename(
            index=NOMES_METRICAS,
            columns=NOMES_METRICAS
        )

        fig, ax = plt.subplots(figsize=(10, 7))

        sns.heatmap(
            correlacao,
            annot=True,
            cmap="coolwarm",
            vmin=-1,
            vmax=1,
            center=0,
            fmt=".2f",
            linewidths=0.5,
            square=True,
            ax=ax
        )

        ax.set_title(
            "EcoSense — Matriz de Correlação de Pearson",
            fontsize=14,
            pad=15
        )

        plt.tight_layout()

        st.pyplot(fig)
        plt.close(fig)

        st.caption(
            "Coeficientes próximos de +1 indicam associação positiva; "
            "próximos de -1, associação negativa; "
            "próximos de 0, associação linear fraca."
        )
    else:
        st.warning(
            "Não há variabilidade suficiente para calcular "
            "a matriz de correlação."
        )


# ------------------------------------------------------------
# GRÁFICOS DE DISPERSÃO
# ------------------------------------------------------------

if len(METRICAS_DISPONIVEIS) >= 2:
    st.header("🔬 Relações entre variáveis ambientais")

    colunas_opcoes = METRICAS_DISPONIVEIS

    col_x, col_y = st.columns(2)

    with col_x:
        variavel_x = st.selectbox(
            "Variável do eixo X",
            options=colunas_opcoes,
            index=0,
            format_func=lambda x: NOMES_METRICAS.get(x, x)
        )

    with col_y:
        indice_y = 1 if len(colunas_opcoes) > 1 else 0

        variavel_y = st.selectbox(
            "Variável do eixo Y",
            options=colunas_opcoes,
            index=indice_y,
            format_func=lambda x: NOMES_METRICAS.get(x, x)
        )

    if variavel_x != variavel_y:
        dados_scatter = df_filtrado[
            [variavel_x, variavel_y]
            + ([COL_CIDADE] if COL_CIDADE else [])
        ].dropna()

        fig_scatter = px.scatter(
            dados_scatter,
            x=variavel_x,
            y=variavel_y,
            hover_name=COL_CIDADE if COL_CIDADE else None,
            trendline="ols",
            title=(
                f"Relação entre {NOMES_METRICAS.get(variavel_x, variavel_x)} "
                f"e {NOMES_METRICAS.get(variavel_y, variavel_y)}"
            ),
            labels={
                variavel_x: NOMES_METRICAS.get(variavel_x, variavel_x),
                variavel_y: NOMES_METRICAS.get(variavel_y, variavel_y)
            }
        )

        fig_scatter.update_layout(
            template="plotly_white",
            height=500
        )

        st.plotly_chart(fig_scatter, use_container_width=True)


# ------------------------------------------------------------
# DISTRIBUIÇÃO DAS CLASSIFICAÇÕES
# ------------------------------------------------------------

if COL_CLASSIFICACAO:
    st.header("🌎 Classificação ambiental das cidades")

    distribuicao = (
        df_filtrado[COL_CLASSIFICACAO]
        .value_counts()
        .reset_index()
    )

    distribuicao.columns = ["Classificação", "Quantidade"]

    fig_classificacao = px.pie(
        distribuicao,
        names="Classificação",
        values="Quantidade",
        hole=0.45,
        title="Participação das cidades por classificação",
        color_discrete_sequence=px.colors.sequential.Greens
    )

    fig_classificacao.update_layout(
        template="plotly_white",
        height=450
    )

    st.plotly_chart(
        fig_classificacao,
        use_container_width=True
    )


# ------------------------------------------------------------
# TABELA DE DADOS
# ------------------------------------------------------------

st.header("📋 Dados detalhados")

st.dataframe(
    df_filtrado,
    use_container_width=True,
    hide_index=True
)

# ------------------------------------------------------------
# DOWNLOAD DOS DADOS FILTRADOS
# ------------------------------------------------------------

csv_download = df_filtrado.to_csv(
    index=False,
    encoding="utf-8-sig"
)

st.download_button(
    label="⬇️ Baixar dados filtrados em CSV",
    data=csv_download,
    file_name="ecosense_dados_filtrados.csv",
    mime="text/csv"
)


# ------------------------------------------------------------
# RODAPÉ
# ------------------------------------------------------------

st.divider()

st.caption(
    "EcoSense | Projeto Integrador | "
    "Inteligência de Negócios aplicada à análise ambiental"
)