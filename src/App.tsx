import { SignedIn, SignedOut } from "@clerk/clerk-react";
import Chat from "./Chat";
import Landing from "./Landing";
import HousingIndustry from "./pages/industries/Housing";
import LegalIndustry from "./pages/industries/Legal";
import OperationsIndustry from "./pages/industries/Operations";

export default function App() {
  return (
    <>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/industries" element={<Industries />} />
          <Route path="/industries/housing" element={<HousingIndustry />} />
          <Route path="/industries/legal" element={<LegalIndustry />} />
          <Route path="/industries/operations" element={<OperationsIndustry />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/security" element={<Security />} />
          <Route path="/pilot" element={<Pilot />} />
        </Routes>
        <Footer />
    </>
  );
}
