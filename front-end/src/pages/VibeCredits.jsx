import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { paymentsAPI } from '../utils/api';

export default function VibeCredits() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiryDate, setExpiryDate] = useState('12/26');
  const [cvc, setCvc] = useState('123');
  const [paying, setPaying] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((plan) => String(plan.id) === String(checkoutPlan)),
    [plans, checkoutPlan]
  );

  const loadCreditsData = async () => {
    setLoading(true);
    try {
      const [balanceRes, plansRes] = await Promise.all([
        paymentsAPI.getCreditsBalance(),
        paymentsAPI.getCreditPlans(),
      ]);

      setCredits(balanceRes.data?.data?.credits ?? 0);
      setPlans(plansRes.data?.data || []);
    } catch (error) {
      setStatus(error.response?.data?.error || error.message || 'Failed to load credits data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreditsData();
  }, []);

  const handleStartCheckout = async (planId) => {
    setStatus('');
    try {
      const response = await paymentsAPI.createCreditsCheckoutSession({ plan_id: planId });
      setCheckoutPlan(planId);
      setCheckoutSession(response.data?.data || null);
    } catch (error) {
      setStatus(error.response?.data?.error || error.message || 'Failed to start checkout');
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan || !checkoutSession) return;

    setPaying(true);
    setStatus('');

    try {
      const response = await paymentsAPI.confirmDemoCreditsPayment({
        plan_id: selectedPlan.id,
        sessionId: checkoutSession.sessionId,
        cardNumber: cardNumber.replace(/\s/g, ''),
        expiryDate,
        cvc,
      });

      setCredits(response.data?.data?.credits ?? credits);
      setStatus(response.data?.message || 'Credits purchased successfully');
      setCheckoutSession(null);
      setCheckoutPlan(null);
    } catch (error) {
      setStatus(error.response?.data?.error || error.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05070a] text-white px-6 py-8">
        <div className="max-w-5xl mx-auto">Loading credits...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-white px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Vibe Credits</h1>
            <p className="text-white/60 text-sm mt-1">Buy credit plans to continue generating workspace code.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Current Balance</span>
            <span className="rounded-full px-3 py-1 text-sm font-semibold bg-cyan-500/20 border border-cyan-400/30 text-cyan-200">
              {credits ?? 0} credits
            </span>
            <button
              type="button"
              onClick={() => navigate('/vibe-code')}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/15"
            >
              Back to Vibe Code
            </button>
          </div>
        </div>

        {status && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90">
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-white/10 bg-[#0b1018] p-5 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <p className="text-white/60 text-sm mt-1">{plan.description}</p>
              </div>

              <div>
                <p className="text-3xl font-bold">{plan.credits}</p>
                <p className="text-xs text-white/60">credits</p>
              </div>

              <div className="text-xl font-semibold">${Number(plan.price_usd).toFixed(2)}</div>

              <button
                type="button"
                onClick={() => handleStartCheckout(plan.id)}
                className="mt-auto rounded-lg bg-cyan-500 text-black font-semibold py-2 hover:bg-cyan-400 transition"
              >
                Buy Plan
              </button>
            </div>
          ))}
        </div>

        {checkoutSession && selectedPlan && (
          <div className="rounded-2xl border border-cyan-400/30 bg-[#0b1018] p-5">
            <h3 className="text-lg font-semibold">Checkout - {selectedPlan.name}</h3>
            <p className="text-sm text-white/60 mt-1">
              Demo payment mode. Use card ending in 0002 to simulate decline.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="Card Number"
                className="rounded-lg bg-[#111827] border border-white/10 px-3 py-2 text-white"
              />
              <input
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                placeholder="MM/YY"
                className="rounded-lg bg-[#111827] border border-white/10 px-3 py-2 text-white"
              />
              <input
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                placeholder="CVC"
                className="rounded-lg bg-[#111827] border border-white/10 px-3 py-2 text-white"
              />
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={paying}
                className="rounded-lg bg-emerald-500 text-black px-4 py-2 font-semibold disabled:opacity-50"
              >
                {paying ? 'Processing...' : `Pay $${Number(selectedPlan.price_usd).toFixed(2)}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckoutSession(null);
                  setCheckoutPlan(null);
                }}
                className="rounded-lg bg-white/10 px-4 py-2 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-white/50">
          Need more generation power? Buy credits here, then return to <Link className="underline" to="/vibe-code">Vibe Code</Link>.
        </p>
      </div>
    </div>
  );
}
