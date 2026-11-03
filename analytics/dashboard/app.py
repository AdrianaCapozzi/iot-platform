
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
    layout="wide",
    initial_sidebar_state="expanded"
)

# ------------------------------------------------------------
# IDENTIDADE VISUAL
# ------------------------------------------------------------

VERDE = "#35C99A"
VERDE_ESCURO = "#147D64"
FUNDO = "#101A18"
PAINEL = "#192824"
TEXTO = "#E8F2EE"
CINZA = "#9FB3AA"

st.markdown("""
<style>
    .stApp {
        background: #101A18;
        color: #E8F2EE;
    }

    [data-testid="stHeader"] {
        background: rgba(16, 26, 24, 0.95);
    }

    [data-testid="stSidebar"] {
        background: #192824;
        border-right: 1px solid #29443A;
    }

    [data-testid="stMetric"] {
        background: #192824;
        border: 1px solid #29443A;
        border-radius: 12px;
        padding: 16px;
    }

    [data-testid="stMetricLabel"] {
        color: #AFC5BA;
    }

    [data-testid="stMetricValue"] {
        color: #E8F2EE;
    }

    h1, h2, h3, p, label {
        color: #E8F2EE;
    }

    .eco-header {
        background: linear-gradient(
            110deg,
            #0B493A 0%,
            #147D64 48%,
            #35C99A 100%
        );
        padding: 30px 34px;
        border-radius: 16px;
        margin-bottom: 24px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.25);
    }

    .eco-header h1 {
        color: #FFFFFF;
        font-size: 36px;
        margin: 0;
        font-weight: 700;
    }

    .eco-header p {
        color: #E0FFF2;
        font-size: 15px;
        margin-top: 8px;
        margin-bottom: 0;
    }

    div[data-testid="stPlotlyChart"],
    div[data-testid="stDataFrame"] {
        background: #192824;
        border-radius: 12px;
        padding: 8px;
    }

    .stSelectbox label,
    .stMultiSelect label {
        color: #E8F2EE !important;
    }

    hr {
        border-color: #29443A;
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



# ============================================================
# ECOSENSE | INTERFACE E VISUALIZACOES DO DASHBOARD
# ============================================================

# ------------------------------------------------------------
# IDENTIDADE VISUAL - TEMA ESCURO
# ------------------------------------------------------------

st.markdown("""
<style>
    .stApp {
        background-color: #101A18;
        color: #E8F2EE;
    }

    [data-testid="stHeader"] {
        background-color: #101A18;
    }

    [data-testid="stSidebar"] {
        background-color: #192824;
        border-right: 1px solid #29443A;
    }

    [data-testid="stMetric"] {
        background-color: #192824;
        border: 1px solid #29443A;
        border-radius: 12px;
        padding: 16px;
    }

    [data-testid="stMetricLabel"] {
        color: #AFC5BA !important;
    }

    [data-testid="stMetricValue"] {
        color: #E8F2EE !important;
    }

    h1, h2, h3, p, label {
        color: #E8F2EE;
    }

    .eco-header {
        background: linear-gradient(
            110deg,
            #0B493A 0%,
            #147D64 48%,
            #35C99A 100%
        );
        padding: 30px 34px;
        border-radius: 16px;
        margin-bottom: 25px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.25);
    }

    .eco-header h1 {
        color: #FFFFFF;
        font-size: 36px;
        margin: 0;
        font-weight: 700;
    }

    .eco-header p {
        color: #E0FFF2;
        font-size: 14px;
        margin-top: 8px;
        margin-bottom: 0;
    }

    div[data-testid="stPlotlyChart"] {
        background-color: #192824;
        border-radius: 12px;
        padding: 8px;
    }

    hr {
        border-color: #29443A;
    }
</style>
""", unsafe_allow_html=True)


# ------------------------------------------------------------
# CABECALHO
# ------------------------------------------------------------

st.markdown("""
<div class="eco-header">
    <h1>EcoSense</h1>
    <p>INTELIGÊNCIA AMBIENTAL | ANÁLISE DE DADOS E INDICADORES URBANOS</p>
</div>
""", unsafe_allow_html=True)

st.markdown(
    "Painel analítico para exploração de indicadores ambientais, "
    "qualidade do ar e conforto urbano."
)

st.divider()


# ------------------------------------------------------------
# FUNCAO AUXILIAR PARA IDENTIFICAR COLUNAS
# ------------------------------------------------------------

def localizar_coluna_dashboard(dataframe, alternativas):

    def normalizar(texto):
        texto = str(texto).strip().lower()
        return re.sub(r"[^a-z0-9]", "", texto)

    mapa_colunas = {
        normalizar(coluna): coluna
        for coluna in dataframe.columns
    }

    for alternativa in alternativas:
        chave = normalizar(alternativa)

        if chave in mapa_colunas:
            return mapa_colunas[chave]

    return None


# ------------------------------------------------------------
# FILTROS LATERAIS
# ------------------------------------------------------------

st.sidebar.header("FILTROS")

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
        df_filtrado[COL_CIDADE]
        .dropna()
        .astype(str)
        .unique()
        .tolist()
    )

    cidades_selecionadas = st.sidebar.multiselect(
        "Cidades",
        options=cidades,
        default=cidades
    )

    df_filtrado = df_filtrado[
        df_filtrado[COL_CIDADE]
        .astype(str)
        .isin(cidades_selecionadas)
    ]


if COL_CLASSIFICACAO:

    classificacoes = sorted(
        df_filtrado[COL_CLASSIFICACAO]
        .dropna()
        .astype(str)
        .unique()
        .tolist()
    )

    classes_selecionadas = st.sidebar.multiselect(
        "Classificação ambiental",
        options=classificacoes,
        default=classificacoes
    )

    df_filtrado = df_filtrado[
        df_filtrado[COL_CLASSIFICACAO]
        .astype(str)
        .isin(classes_selecionadas)
    ]


st.sidebar.divider()

st.sidebar.caption(
    "Os filtros selecionados atualizam os indicadores e gráficos."
)


# ------------------------------------------------------------
# INDICADORES GERAIS
# ------------------------------------------------------------

st.header("Indicadores gerais")

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

col1.metric(
    "Cidades analisadas",
    f"{quantidade_cidades:,}"
)

col2.metric(
    "Registros",
    f"{quantidade_registros:,}"
)

col3.metric(
    "ICAU-D médio",
    f"{media_icaud:.2f}" if pd.notna(media_icaud) else "N/D"
)

col4.metric(
    "PM2.5 médio",
    f"{media_pm25:.2f}" if pd.notna(media_pm25) else "N/D"
)

st.divider()


# ============================================================
# VISUALIZACAO 1 - GRAFICO DE DISPERSAO
# PM2.5 x ICAU-D
# ============================================================

st.header("01 | Relação entre poluição e conforto ambiental")

st.caption(
    "Análise da associação entre a concentração de partículas "
    "finas no ar e o Índice de Conforto Ambiental Urbano."
)

if COL_PM25 and COL_ICAUD:

    dados_dispersao = df_filtrado[
        [COL_PM25, COL_ICAUD]
        + ([COL_CIDADE] if COL_CIDADE else [])
    ].copy()

    dados_dispersao = dados_dispersao.dropna(
        subset=[COL_PM25, COL_ICAUD]
    )

    if len(dados_dispersao) >= 2:

        fig_dispersao = px.scatter(
            dados_dispersao,
            x=COL_PM25,
            y=COL_ICAUD,
            hover_name=COL_CIDADE if COL_CIDADE else None,
            color=COL_ICAUD,
            color_continuous_scale=[
                "#D96C6C",
                "#E8B75B",
                "#35C99A"
            ],
            labels={
                COL_PM25: "PM2.5",
                COL_ICAUD: "ICAU-D"
            },
            title="Concentração de PM2.5 em relação ao ICAU-D"
        )

        fig_dispersao.update_layout(
            template="plotly_dark",
            paper_bgcolor="#192824",
            plot_bgcolor="#192824",
            font_color="#E8F2EE",
            height=480
        )

        st.plotly_chart(
            fig_dispersao,
            use_container_width=True
        )

        st.caption(
            "Cada ponto representa uma cidade. A posição dos pontos "
            "permite observar padrões de associação entre as variáveis."
        )

    else:
        st.warning(
            "Não existem registros suficientes para o gráfico de dispersão."
        )

else:
    st.warning(
        "Não foram identificadas as colunas de PM2.5 e ICAU-D."
    )


st.divider()


# ============================================================
# VISUALIZACAO 2 E 3 - GRAFICOS DE BARRAS HORIZONTAIS
# RANKING DE CIDADES
# ============================================================

st.header("02 | Ranking comparativo das cidades")

st.caption(
    "Comparação entre as cidades com maiores e menores valores "
    "registrados para o ICAU-D."
)

if COL_CIDADE and COL_ICAUD:

    ranking = (
        df_filtrado[[COL_CIDADE, COL_ICAUD]]
        .dropna()
        .drop_duplicates(subset=[COL_CIDADE])
        .sort_values(COL_ICAUD, ascending=False)
    )

    col_top, col_bottom = st.columns(2)

    with col_top:

        top_10 = ranking.head(10).sort_values(COL_ICAUD)

        fig_top = px.bar(
            top_10,
            x=COL_ICAUD,
            y=COL_CIDADE,
            orientation="h",
            title="10 maiores valores de ICAU-D",
            labels={
                COL_CIDADE: "Cidade",
                COL_ICAUD: "ICAU-D"
            },
            color=COL_ICAUD,
            color_continuous_scale=[
                "#147D64",
                "#35C99A"
            ]
        )

        fig_top.update_layout(
            template="plotly_dark",
            paper_bgcolor="#192824",
            plot_bgcolor="#192824",
            font_color="#E8F2EE",
            showlegend=False,
            coloraxis_showscale=False,
            height=460
        )

        st.plotly_chart(
            fig_top,
            use_container_width=True
        )

    with col_bottom:

        bottom_10 = ranking.tail(10).sort_values(COL_ICAUD)

        fig_bottom = px.bar(
            bottom_10,
            x=COL_ICAUD,
            y=COL_CIDADE,
            orientation="h",
            title="10 menores valores de ICAU-D",
            labels={
                COL_CIDADE: "Cidade",
                COL_ICAUD: "ICAU-D"
            },
            color=COL_ICAUD,
            color_continuous_scale=[
                "#D96C6C",
                "#E8B75B"
            ]
        )

        fig_bottom.update_layout(
            template="plotly_dark",
            paper_bgcolor="#192824",
            plot_bgcolor="#192824",
            font_color="#E8F2EE",
            showlegend=False,
            coloraxis_showscale=False,
            height=460
        )

        st.plotly_chart(
            fig_bottom,
            use_container_width=True
        )

else:

    st.warning(
        "Não foram identificadas as colunas de cidade e ICAU-D."
    )


st.divider()


# ============================================================
# VISUALIZACAO 4 - HEATMAP
# MATRIZ DE CORRELACAO DE PEARSON
# ============================================================

st.header("03 | Matriz de correlação ambiental")

st.caption(
    "Identificação da direção e da intensidade das associações "
    "lineares entre as variáveis ambientais."
)

variaveis_heatmap = [
    COL_TEMP,
    COL_UMIDADE,
    COL_PM25,
    COL_PM10,
    COL_VENTO,
    COL_ICAUD
]

variaveis_heatmap = [
    coluna
    for coluna in variaveis_heatmap
    if coluna is not None and coluna in df_filtrado.columns
]

if len(variaveis_heatmap) >= 2:

    dados_correlacao = df_filtrado[
        variaveis_heatmap
    ].copy()

    dados_correlacao = dados_correlacao.apply(
        pd.to_numeric,
        errors="coerce"
    )

    # Excluir variáveis sem variação
    dados_correlacao = dados_correlacao.loc[
        :,
        dados_correlacao.nunique() > 1
    ]

    if dados_correlacao.shape[1] >= 2:

        correlacao = dados_correlacao.corr(
            method="pearson"
        )

        nomes_legiveis = {
            COL_TEMP: "Temperatura",
            COL_UMIDADE: "Umidade",
            COL_PM25: "PM2.5",
            COL_PM10: "PM10",
            COL_VENTO: "Vento",
            COL_ICAUD: "ICAU-D"
        }

        correlacao = correlacao.rename(
            index=nomes_legiveis,
            columns=nomes_legiveis
        )

        fig_heatmap, ax = plt.subplots(
            figsize=(10, 7)
        )

        fig_heatmap.patch.set_facecolor("#192824")
        ax.set_facecolor("#192824")

        sns.heatmap(
            correlacao,
            annot=True,
            cmap="RdYlGn",
            vmin=-1,
            vmax=1,
            center=0,
            fmt=".2f",
            linewidths=0.7,
            square=True,
            cbar_kws={
                "label": "Correlação de Pearson"
            },
            annot_kws={
                "color": "#101A18",
                "weight": "bold"
            },
            ax=ax
        )

        ax.set_title(
            "EcoSense | Matriz de Correlação",
            color="#E8F2EE",
            fontsize=15,
            pad=18
        )

        ax.tick_params(
            colors="#E8F2EE"
        )

        ax.xaxis.label.set_color("#E8F2EE")
        ax.yaxis.label.set_color("#E8F2EE")

        fig_heatmap.tight_layout()

        st.pyplot(
            fig_heatmap,
            use_container_width=True
        )

        plt.close(fig_heatmap)

        st.caption(
            "Valores próximos de +1 indicam associação positiva; "
            "próximos de -1 indicam associação negativa; "
            "próximos de zero indicam associação linear fraca."
        )

    else:

        st.warning(
            "Não há variabilidade suficiente para calcular "
            "a matriz de correlação."
        )

else:

    st.warning(
        "Não foram encontradas variáveis numéricas suficientes "
        "para construir o heatmap."
    )


st.divider()


# ============================================================
# VISUALIZACAO 5 - LINHA TEMPORAL
# HISTORICO DE MEDICOES DOS SENSORES
# ============================================================

st.header("04 | Evolução temporal das medições")

st.caption(
    "Análise da variação dos indicadores ambientais ao longo "
    "do tempo, conforme a disponibilidade de registros históricos."
)


# Procurar o arquivo sensores.csv
CAMINHO_SENSORES = os.path.join(
    BASE_DIR,
    "sensores.csv"
)

if not os.path.exists(CAMINHO_SENSORES):

    CAMINHO_SENSORES = os.path.join(
        BASE_DIR,
        "analytics",
        "outputs",
        "sensores.csv"
    )


if os.path.exists(CAMINHO_SENSORES):

    try:

        df_sensores = pd.read_csv(
            CAMINHO_SENSORES
        )

        col_data = localizar_coluna_dashboard(
            df_sensores,
            [
                "recordedAt",
                "timestamp",
                "datetime",
                "date",
                "data_hora",
                "datahora",
                "createdAt",
                "measuredAt",
                "lastUpdated"
            ]
        )

        variaveis_temporais = {
            "Temperatura": [
                "temperature",
                "temp",
                "temperatura"
            ],
            "Umidade": [
                "humidity",
                "umidade",
                "relative_humidity"
            ],
            "PM2.5": [
                "pm25",
                "pm2_5",
                "pm2.5"
            ],
            "PM10": [
                "pm10"
            ],
            "Velocidade do vento": [
                "windSpeed",
                "wind_speed",
                "windspeed"
            ]
        }

        colunas_temporais = {}

        for nome, alternativas in variaveis_temporais.items():

            coluna = localizar_coluna_dashboard(
                df_sensores,
                alternativas
            )

            if coluna:
                colunas_temporais[nome] = coluna


        if col_data and colunas_temporais:

            dados_tempo = df_sensores.copy()

            dados_tempo[col_data] = pd.to_datetime(
                dados_tempo[col_data],
                errors="coerce",
                utc=True
            )

            dados_tempo = dados_tempo.dropna(
                subset=[col_data]
            )

            if not dados_tempo.empty:

                variavel_escolhida = st.selectbox(
                    "Selecione o indicador ambiental",
                    options=list(colunas_temporais.keys())
                )

                coluna_escolhida = colunas_temporais[
                    variavel_escolhida
                ]

                dados_tempo[coluna_escolhida] = pd.to_numeric(
                    dados_tempo[coluna_escolhida],
                    errors="coerce"
                )

                dados_tempo = dados_tempo.dropna(
                    subset=[coluna_escolhida]
                )

                # Agrupar medições por hora
                dados_tempo["Periodo"] = (
                    dados_tempo[col_data].dt.floor("h")
                )

                serie_temporal = (
                    dados_tempo
                    .groupby("Periodo")[coluna_escolhida]
                    .mean()
                    .reset_index()
                    .sort_values("Periodo")
                )

                if len(serie_temporal) >= 2:

                    fig_temporal = px.line(
                        serie_temporal,
                        x="Periodo",
                        y=coluna_escolhida,
                        markers=True,
                        title=(
                            "Evolução temporal de "
                            + variavel_escolhida
                        ),
                        labels={
                            "Periodo": "Data e hora",
                            coluna_escolhida: variavel_escolhida
                        }
                    )

                    fig_temporal.update_traces(
                        line={
                            "color": "#35C99A",
                            "width": 3
                        },
                        marker={
                            "size": 7
                        }
                    )

                    fig_temporal.update_layout(
                        template="plotly_dark",
                        paper_bgcolor="#192824",
                        plot_bgcolor="#192824",
                        font_color="#E8F2EE",
                        height=450
                    )

                    st.plotly_chart(
                        fig_temporal,
                        use_container_width=True
                    )

                    st.caption(
                        "Os pontos representam médias horárias "
                        "das medições disponíveis no arquivo."
                    )

                else:

                    st.warning(
                        "Existem menos de duas medições válidas. "
                        "Não é possível construir uma linha temporal."
                    )

            else:

                st.warning(
                    "A coluna de data/hora não contém datas válidas."
                )

        else:

            st.warning(
                "O arquivo sensores.csv não possui uma coluna "
                "de data/hora ou variáveis ambientais reconhecidas."
            )

    except Exception as erro:

        st.error(
            f"Não foi possível processar sensores.csv: {erro}"
        )

else:

    st.warning(
        "O arquivo sensores.csv não foi encontrado. "
        "A visualização temporal depende de registros históricos "
        "com data/hora e valores de medição."
    )


st.divider()


# ============================================================
# TABELA DE DADOS
# ============================================================

st.header("Dados detalhados")

st.dataframe(
    df_filtrado,
    use_container_width=True,
    hide_index=True
)


# ============================================================
# DOWNLOAD DOS DADOS FILTRADOS
# ============================================================

csv_download = df_filtrado.to_csv(
    index=False,
    encoding="utf-8-sig"
)

st.download_button(
    label="Baixar dados filtrados em CSV",
    data=csv_download,
    file_name="ecosense_dados_filtrados.csv",
    mime="text/csv"
)


# ============================================================
# RODAPE
# ============================================================

st.divider()

st.markdown(
    """
    <div style="
        text-align:center;
        color:#9FB3AA;
        padding:15px;
        font-size:13px;
    ">
        EcoSense | Projeto Integrador<br>
        Inteligência de Negócios aplicada à análise ambiental
    </div>
    """,
    unsafe_allow_html=True
)
