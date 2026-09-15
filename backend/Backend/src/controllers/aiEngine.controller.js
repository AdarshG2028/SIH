const {
  simulateWhatIf,
  generatePlan,
  scorePriority,
  getKpis,
} = require("../services/mlClient.service");
const { simulateBlockImpact, hasSectionData } = require("../services/impact.service");
const { toLegacyShape } = require("../services/whatIfLegacyAdapter");

// Stateless pass-throughs to the Python ML engine. The ML response is
// returned unchanged inside the usual { success, data } envelope.

const whatIf = async (req, res, next) => {
  try {
    const body = req.body || {};
    const { corridor, proposed_date, proposed_start_time, proposed_end_time } = body;

    // Prefer the real network-data engine (impact.service.js) when the
    // requested corridor is actually in the seeded dataset. Some of the ML
    // engine's sample corridors use station codes outside the public
    // dataset's ~2016 snapshot (e.g. BPL-RKMP's RKMP, a post-2021 rename —
    // see docs/NETWORK_DATA.md), so this falls back to the ML engine's
    // hard-coded sample rather than erroring for those.
    if (corridor && (await hasSectionData(corridor))) {
      const result = await simulateBlockImpact({
        sectionId: corridor,
        date: proposed_date,
        startTime: proposed_start_time,
        endTime: proposed_end_time,
      });

      return res.json({
        success: true,
        data: toLegacyShape(result, {
          department: body.department,
          maintenanceType: body.maintenance_type,
        }),
      });
    }

    const data = await simulateWhatIf(body);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const optimizedPlan = async (req, res, next) => {
  try {
    const data = await generatePlan(req.body || {});

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const priority = async (req, res, next) => {
  try {
    const data = await scorePriority(req.body || {});

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const kpis = async (req, res, next) => {
  try {
    const data = await getKpis();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  whatIf,
  optimizedPlan,
  priority,
  kpis,
};
