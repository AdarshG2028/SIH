const fs = require("fs");
const csv = require("csv-parser");

const BATCH_SIZE = 1000;

const importCSV = (filePath, Model) => {
  return new Promise((resolve, reject) => {
    const batch = [];
    let inserted = 0;
    let failed = 0;

    const stream = fs.createReadStream(filePath).pipe(csv());

    const insertBatch = async () => {
      if (batch.length === 0) return;

      const records = batch.splice(0, batch.length);

      try {
        const result = await Model.insertMany(records, {
          ordered: false,
        });

        inserted += result.length;
      } catch (error) {
        // With ordered:false, valid records are still inserted.
        if (error.insertedDocs) {
          inserted += error.insertedDocs.length;
        }

        failed += records.length - (error.insertedDocs?.length || 0);
      }
    };

    stream.on("data", async (row) => {
      stream.pause();

      batch.push(row);

      if (batch.length >= BATCH_SIZE) {
        await insertBatch();
      }

      stream.resume();
    });

    stream.on("end", async () => {
      try {
        await insertBatch();

        resolve({
          inserted,
          failed,
        });
      } catch (error) {
        reject(error);
      }
    });

    stream.on("error", reject);
  });
};

module.exports = importCSV;
