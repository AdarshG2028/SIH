import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Tasks from "./pages/Tasks";
import AssetDetails from "./pages/AssetDetails";
import Planning from "./pages/Planning";
import Dashboard from "./pages/Dashboard";
import Plans from "./pages/Plans";
import BlockDetails from "./pages/BlockDetails";
import KPI from "./pages/KPI";
import WhatIf from "./pages/WhatIf";
import Actuals from "./pages/Actuals";
import Emergency from "./pages/Emergency";
import Navigation from "./components/layout/Navigation";

function App() {
  return (
    <BrowserRouter>
      <Navigation />

      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route path="/tasks" element={<Tasks />} />

        <Route path="/assets/:assetId" element={<AssetDetails />} />

        <Route path="/planning" element={<Planning />} />

        <Route path="/planning/blocks/:blockId" element={<BlockDetails />} />

        <Route path="/planning/emergency" element={<Emergency />} />

        <Route path="/planning/actuals" element={<Actuals />} />

        <Route path="/plans" element={<Plans />} />

        <Route path="/kpi" element={<KPI />} />

        <Route path="/what-if" element={<WhatIf />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
