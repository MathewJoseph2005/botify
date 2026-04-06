import supabase from '../config/database.js';

const DEFAULT_STARTING_CREDITS = Number(process.env.DEFAULT_STARTING_CREDITS || 20);

const FALLBACK_PLANS = [
  { id: 'starter', name: 'Starter', credits: 25, price_usd: 5, description: 'Best for trying Vibe Code', sort_order: 1 },
  { id: 'pro', name: 'Pro', credits: 100, price_usd: 15, description: 'For frequent bot generation', sort_order: 2 },
  { id: 'scale', name: 'Scale', credits: 300, price_usd: 35, description: 'For teams and high volume', sort_order: 3 },
];

function normalizeNoRowError(error) {
  return Boolean(error && (error.code === 'PGRST116' || /no rows/i.test(error.message || '')));
}

export async function getOrCreateUserCredits(userId) {
  const normalizedUserId = Number(userId);

  const { data: existing, error: readError } = await supabase
    .from('user_credits')
    .select('user_id, credits_balance, total_purchased, total_used, updated_at')
    .eq('user_id', normalizedUserId)
    .single();

  if (!readError && existing) {
    return existing;
  }

  if (readError && !normalizeNoRowError(readError)) {
    throw new Error(`Failed to fetch user credits: ${readError.message}`);
  }

  const { data: created, error: insertError } = await supabase
    .from('user_credits')
    .insert({
      user_id: normalizedUserId,
      credits_balance: DEFAULT_STARTING_CREDITS,
      total_purchased: 0,
      total_used: 0,
    })
    .select('user_id, credits_balance, total_purchased, total_used, updated_at')
    .single();

  if (insertError) {
    throw new Error(`Failed to create user credits: ${insertError.message}`);
  }

  return created;
}

export async function listCreditPlans() {
  const { data, error } = await supabase
    .from('credit_plans')
    .select('id, name, credits, price_usd, description, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return FALLBACK_PLANS;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return FALLBACK_PLANS;
  }

  return data.map((plan) => ({
    id: String(plan.id),
    name: plan.name,
    credits: Number(plan.credits),
    price_usd: Number(plan.price_usd),
    description: plan.description,
    sort_order: Number(plan.sort_order || 0),
  }));
}

export async function addCredits({ userId, credits, amountUsd, source = 'purchase', reference = null, metadata = null }) {
  const current = await getOrCreateUserCredits(userId);
  const increment = Math.max(1, Number(credits));

  const updatedBalance = Number(current.credits_balance) + increment;
  const updatedPurchased = Number(current.total_purchased || 0) + increment;

  const { data: updated, error: updateError } = await supabase
    .from('user_credits')
    .update({
      credits_balance: updatedBalance,
      total_purchased: updatedPurchased,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', Number(userId))
    .select('user_id, credits_balance, total_purchased, total_used, updated_at')
    .single();

  if (updateError) {
    throw new Error(`Failed to update credits: ${updateError.message}`);
  }

  await supabase
    .from('credit_transactions')
    .insert({
      user_id: Number(userId),
      transaction_type: source,
      credits_delta: increment,
      amount_usd: Number(amountUsd || 0),
      status: 'succeeded',
      reference,
      metadata,
    });

  return updated;
}

export async function consumeCredits({ userId, credits = 1, reason = 'generation', metadata = null }) {
  const current = await getOrCreateUserCredits(userId);
  const debit = Math.max(1, Number(credits));

  if (Number(current.credits_balance) < debit) {
    return {
      success: false,
      credits_balance: Number(current.credits_balance),
      required: debit,
    };
  }

  const updatedBalance = Number(current.credits_balance) - debit;
  const updatedUsed = Number(current.total_used || 0) + debit;

  const { data: updated, error: updateError } = await supabase
    .from('user_credits')
    .update({
      credits_balance: updatedBalance,
      total_used: updatedUsed,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', Number(userId))
    .select('user_id, credits_balance, total_purchased, total_used, updated_at')
    .single();

  if (updateError) {
    throw new Error(`Failed to consume credits: ${updateError.message}`);
  }

  await supabase
    .from('credit_transactions')
    .insert({
      user_id: Number(userId),
      transaction_type: 'usage',
      credits_delta: -debit,
      amount_usd: 0,
      status: 'succeeded',
      reference: reason,
      metadata,
    });

  return {
    success: true,
    ...updated,
  };
}
