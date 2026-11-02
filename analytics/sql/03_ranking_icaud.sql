
-- EcoSense | Ranking das 50 cidades com maior ICAU-D

SELECT
    name AS cidade,
    country AS pais,
    sensor_count AS quantidade_sensores,
    temperature AS temperatura,
    humidity AS umidade,
    pm25,
    pm10,
    wind_speed AS velocidade_vento,
    icaud_score AS indice_icaud,
    icaud_class AS classificacao

FROM read_csv_auto('analytics/outputs/cidades.csv')

WHERE icaud_score IS NOT NULL

ORDER BY icaud_score DESC

LIMIT 50;
