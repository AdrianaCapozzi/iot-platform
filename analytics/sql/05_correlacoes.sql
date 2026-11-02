
-- EcoSense | Matriz de correlação entre variáveis ambientais

SELECT

    ROUND(CORR(temperature, icaud_score), 3)
        AS correlacao_temperatura_icaud,

    ROUND(CORR(humidity, icaud_score), 3)
        AS correlacao_umidade_icaud,

    ROUND(CORR(pm25, icaud_score), 3)
        AS correlacao_pm25_icaud,

    ROUND(CORR(pm10, icaud_score), 3)
        AS correlacao_pm10_icaud,

    ROUND(CORR(wind_speed, icaud_score), 3)
        AS correlacao_vento_icaud,

    ROUND(CORR(pm25, pm10), 3)
        AS correlacao_pm25_pm10

FROM read_csv_auto('analytics/outputs/cidades.csv')

WHERE
    temperature IS NOT NULL
    AND humidity IS NOT NULL
    AND pm25 IS NOT NULL
    AND pm10 IS NOT NULL
    AND wind_speed IS NOT NULL
    AND icaud_score IS NOT NULL;
