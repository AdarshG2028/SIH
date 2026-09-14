const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const AssetRiskScore = require("../models/AssetRiskScore");
const EnsemblePrediction = require("../models/EnsemblePrediction");
const AssetExplanation = require("../models/AssetExplanation");

const ML_OUTPUT_DIR = path.resolve(__dirname, "../../../ML/outputs");

const readCSV = (fileName) => {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(path.join(ML_OUTPUT_DIR, fileName))
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
};

const importRiskScores = async () => {
  const rows = await readCSV("asset_risk_scores.csv");

  if (rows.length === 0) {
    return { processed: 0 };
  }

  const operations = rows.map((row) => ({
    updateOne: {
      filter: {
        asset_id: row.asset_id,
        snapshot_date: new Date(row.snapshot_date),
      },
      update: {
        $set: {
          actual: Number(row.actual),
          predicted_probability: Number(row.predicted_probability),
          predicted_class: Number(row.predicted_class),
          risk_probability: Number(row.risk_probability),
          risk_level: row.risk_level,
          risk_score: Number(row.risk_score),
          recommended_action: row.recommended_action,
        },
      },
      upsert: true,
    },
  }));

  const result = await AssetRiskScore.bulkWrite(operations);

  return {
    processed: rows.length,
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
  };
};

const importEnsemblePredictions = async () => {
  const rows = await readCSV("ensemble_predictions.csv");

  if (rows.length === 0) {
    return { processed: 0 };
  }

  const operations = rows.map((row) => ({
    updateOne: {
      filter: {
        asset_id: row.asset_id,
        snapshot_date: new Date(row.snapshot_date),
      },
      update: {
        $set: {
          actual_maintenance: Number(row.actual_maintenance),
          lgb_probability: Number(row.lgb_probability),
          cnn_probability: Number(row.cnn_probability),
          rf_probability: Number(row.rf_probability),
          ensemble_probability: Number(row.ensemble_probability),
          predicted_maintenance: Number(row.predicted_maintenance),
          threshold: Number(row.threshold),
          risk_level: row.risk_level,
        },
      },
      upsert: true,
    },
  }));

  const result = await EnsemblePrediction.bulkWrite(operations);

  return {
    processed: rows.length,
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
  };
};

const importExplanations = async () => {
  const rows = await readCSV("asset_explanations.csv");

  if (rows.length === 0) {
    return { processed: 0 };
  }

  const operations = rows.map((row) => ({
    updateOne: {
      filter: {
        asset_id: row.asset_id,
        snapshot_date: new Date(row.snapshot_date),
      },
      update: {
        $set: {
          ensemble_probability: Number(row.ensemble_probability),
          risk_level: row.risk_level,
          top_reason_1: row.top_reason_1,
          top_reason_2: row.top_reason_2,
          top_reason_3: row.top_reason_3,
          top_reason_4: row.top_reason_4,
          top_reason_5: row.top_reason_5,
          protective_factor_1: row.protective_factor_1,
          protective_factor_2: row.protective_factor_2,
          protective_factor_3: row.protective_factor_3,
        },
      },
      upsert: true,
    },
  }));

  const result = await AssetExplanation.bulkWrite(operations);

  return {
    processed: rows.length,
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
  };
};

const importMLOutputs = async () => {
  const [riskScores, ensemblePredictions, explanations] = await Promise.all([
    importRiskScores(),
    importEnsemblePredictions(),
    importExplanations(),
  ]);

  return {
    riskScores,
    ensemblePredictions,
    explanations,
  };
};

module.exports = {
  importMLOutputs,
};
