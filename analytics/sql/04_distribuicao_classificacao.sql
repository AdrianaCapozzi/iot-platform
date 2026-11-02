
-- EcoSense | Distribuição das cidades por classificação ICAU-D

SELECT
    icaud_class AS classificacao,

    COUNT(*) AS total_cidades,

    ROUND(
        COUNT(*) * 100.0 /
        (SELECT COUNT(*)
         FROM read_csv_auto('analytics/outputs/cidades.csv')
         WHERE icaud_class IS NOT NULL),
        2
    ) AS percentual_cidades,

    ROUND(AVG(icaud_score), 2) AS media_icaud,

    ROUND(AVG(pm25), 2) AS media_pm25,

    ROUND(AVG(temperature), 2) AS media_temperatura

FROM read_csv_auto('analytics/outputs/cidades.csv')

WHERE icaud_class IS NOT NULL

GROUP BY icaud_class

ORDER BY total_cidades DESC;
