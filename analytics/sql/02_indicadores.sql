
-- EcoSense | Estatística descritiva dos indicadores ambientais

SELECT
    COUNT(*) AS total_cidades,

    ROUND(AVG(temperature), 2) AS media_temperatura,
    ROUND(MIN(temperature), 2) AS temperatura_minima,
    ROUND(MAX(temperature), 2) AS temperatura_maxima,

    ROUND(AVG(humidity), 2) AS media_umidade,
    ROUND(AVG(pm25), 2) AS media_pm25,
    ROUND(AVG(pm10), 2) AS media_pm10,
    ROUND(AVG(wind_speed), 2) AS media_velocidade_vento,

    ROUND(AVG(icaud_score), 2) AS media_icaud,
    ROUND(MIN(icaud_score), 2) AS menor_icaud,
    ROUND(MAX(icaud_score), 2) AS maior_icaud

FROM read_csv_auto('analytics/outputs/cidades.csv');
