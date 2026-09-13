// Matemática e estado independentes do navegador e da apresentação 3D.
export const SIDES = ['blue', 'red', 'yellow', 'purple'];
export const PURPLE_BOTTLE_GROUPS = Object.freeze([
  [3, 4, 5, 7, 12],
  [4, 6, 7, 9, 10],
  [2, 3, 5, 7, 8],
  [2, 5, 6, 9, 12]
]);
export const MAX_FLASKS = 10;
export const MAX_TOTAL = 100;
export const total = values => values.reduce((sum, value) => sum + value, 0);
const uniform = values => values.length > 0 && values.every(value => Number.isInteger(value) && value >= 2 && value <= 12 && value === values[0]);
const bounded = values => values.length <= MAX_FLASKS && total(values) <= MAX_TOTAL;
export function validateDial(values, target) {
  return uniform(values) && bounded(values) && total(values) === target;
}
export function validatePurple(left, right) {
  return uniform(left) && uniform(right) && bounded(left) && bounded(right)
    && left[0] !== right[0] && total(left) === total(right);
}
// Positive Z rotation lowers the left endpoint (negative X).
export function balanceTilt(leftTotal, rightTotal) {
  return Math.max(-0.24, Math.min(0.24, (leftTotal - rightTotal) * 0.014));
}
export function dialSolutions(target, values) {
  return values.filter(value => target % value === 0 && target / value >= 1 && target / value <= MAX_FLASKS)
    .map(value => ({ value, count: target / value }));
}
export function purpleSolutions(values) {
  const solutions = [];
  for (let i = 0; i < values.length; i++) for (let j = i + 1; j < values.length; j++) {
    for (let leftCount = 1; leftCount <= MAX_FLASKS; leftCount++) {
      const product = leftCount * values[i], rightCount = product / values[j];
      if (Number.isInteger(rightCount) && rightCount >= 1 && rightCount <= MAX_FLASKS && product <= MAX_TOTAL)
        solutions.push({ leftValue: values[i], rightValue: values[j], leftCount, rightCount });
    }
  }
  return solutions;
}
export function valuesForSide(config, side) {
  return config.valuesBySide?.[side] || config.values || [];
}
function isPuzzleEntry(entry) {
  if (!entry || !Number.isInteger(entry.target) || entry.target < 2 || entry.target > MAX_TOTAL
    || !Array.isArray(entry.ballsPerBottle) || entry.ballsPerBottle.length !== 5
    || new Set(entry.ballsPerBottle).size !== 5
    || !entry.ballsPerBottle.every(value => Number.isInteger(value) && value >= 2 && value <= 12)
    || !Array.isArray(entry.correct) || !entry.correct.length) return false;
  return entry.correct.every(pair => Array.isArray(pair) && pair.length === 2
    && Number.isInteger(pair[0]) && pair[0] >= 1 && pair[0] <= MAX_FLASKS
    && Number.isInteger(pair[1]) && entry.ballsPerBottle.includes(pair[1])
    && pair[0] * pair[1] === entry.target);
}
export function validatePuzzleEntries(entries) {
  if (!Array.isArray(entries) || !entries.length || !entries.every(isPuzzleEntry))
    throw new Error('As configurações da caixa têm um formato inválido.');
  const groups = {
    blue: entries.filter(entry => entry.target <= 24),
    yellow: entries.filter(entry => entry.target > 24 && entry.target <= 40),
    red: entries.filter(entry => entry.target > 40)
  };
  if (Object.values(groups).some(group => !group.length))
    throw new Error('Falta uma configuração para uma das balanças coloridas.');
  if (PURPLE_BOTTLE_GROUPS.some(group => !purpleSolutions(group).length))
    throw new Error('Uma configuração roxa não permite resolver a balança roxa.');
  return groups;
}
export function validateConfiguredDial(values, puzzle) {
  return uniform(values) && bounded(values)
    && puzzle.correct.some(([count, value]) => values.length === count && values[0] === value);
}
export const OPERATION_META = Object.freeze({
  soma: { title: 'Essa é fácil...', symbol: '+', calc: (x, y) => x + y },
  subtracao: { title: 'Vamos subtrair?', symbol: '-', calc: (x, y) => x - y },
  divisao: { title: 'Você sabe dividir?', symbol: '÷', calc: (x, y) => x / y }
});
export function generateHints(targets, contasEntries, rng = Math.random) {
  if (!contasEntries || !Array.isArray(contasEntries)) return null;
  const sides = ['blue', 'yellow', 'red'];
  const ops = ['soma', 'subtracao', 'divisao'];
  for (let i = ops.length - 1; i > 0; i--) {
    const j = Math.floor(Math.max(0, Math.min(0.999999999, rng())) * (i + 1));
    const tmp = ops[i]; ops[i] = ops[j]; ops[j] = tmp;
  }
  const contasByTarget = new Map(contasEntries.map(entry => [entry.target, entry]));
  const hints = {};
  for (let i = 0; i < sides.length; i++) {
    const side = sides[i], target = targets[side], operation = ops[i], meta = OPERATION_META[operation];
    const entry = contasByTarget.get(target);
    if (!entry || !entry[operation] || !entry[operation].length) {
      throw new Error('Faltam contas de ' + operation + ' para o alvo ' + target + '.');
    }
    const pairs = entry[operation];
    const pickIndex = Math.floor(Math.max(0, Math.min(0.999999999, rng())) * pairs.length);
    const [x, y] = pairs[pickIndex];
    hints[side] = {
      operation,
      x,
      y,
      title: meta.title,
      expression: `${x} ${meta.symbol} ${y} = ?`
    };
  }
  return hints;
}
export const signature = config => JSON.stringify([
  SIDES.slice(0, 3).map(side => config.dialPuzzles[side]),
  config.valuesBySide?.purple
]);
export function generatePuzzle(entries, rng = Math.random, recent = [], contasEntries = null) {
  const groups = validatePuzzleEntries(entries);
  for (let attempt = 0; ; attempt++) {
    const pick = group => group[(Math.floor(Math.max(0, Math.min(.999999999, rng())) * group.length) + attempt) % group.length];
    const dialPuzzles = Object.fromEntries(['blue', 'yellow', 'red'].map(side => {
      const entry = pick(groups[side]);
      return [side, { target: entry.target, ballsPerBottle: [...entry.ballsPerBottle], correct: entry.correct.map(pair => [...pair]) }];
    }));
    const valuesBySide = Object.fromEntries(Object.entries(dialPuzzles).map(([side, puzzle]) => [side, [...puzzle.ballsPerBottle]]));
    const purpleGroup = PURPLE_BOTTLE_GROUPS[(Math.floor(Math.max(0, Math.min(.999999999, rng())) * PURPLE_BOTTLE_GROUPS.length) + attempt) % PURPLE_BOTTLE_GROUPS.length];
    valuesBySide.purple = [...purpleGroup];
    const targets = Object.fromEntries(Object.entries(dialPuzzles).map(([side, puzzle]) => [side, puzzle.target]));
    const hints = contasEntries ? generateHints(targets, contasEntries, rng) : null;
    const config = { dialPuzzles, valuesBySide, targets, ...(hints ? { hints } : {}) };
    if (!recent.includes(signature(config)) || attempt > recent.length + 20) return config;
  }
}
export function createState(config, round = 1) {
  return { config, round, sides: Object.fromEntries(SIDES.map(side => [side, {
    left: [], right: [], solved: false, errors: 0, attempts: 0, rejected: [], feedback: 'ready', detail: ''
  }])), complete: false, reward: 'closed', events: [] };
}
export const isComplete = state => SIDES.every(side => state.sides[side].solved);
export function expression(values) { return values.length ? values.length + ' × ' + values[0] + ' = ' + total(values) : '0 × ? = 0'; }
export function scoreInput(state) {
  return { total: 4, acertosPrimeira: SIDES.filter(side => state.sides[side].solved && state.sides[side].errors === 0).length,
    erros: SIDES.reduce((sum, side) => sum + state.sides[side].errors, 0), rodada: state.round, concluida: isComplete(state), tempoAtivo: false };
}
export function submissionKey(puzzle) { return JSON.stringify([puzzle.left, puzzle.right]); }
export function canSubmit(state, side) {
  const p = state.sides[side];
  return !p.solved && p.left.length > 0 && (side !== 'purple' || p.right.length > 0) && !p.rejected.includes(submissionKey(p));
}
function moveFlask(state, action) {
  const from=action.from,to={side:action.side,pan:action.pan||'left'};
  const validLocation = location => location && SIDES.includes(location.side)
    && ['left','right'].includes(location.pan) && (location.side==='purple'||location.pan==='left');
  if(!validLocation(from)||!validLocation(to))return {state,outcome:'invalid',reason:'Escolha um prato.'};
  const source=state.sides[from.side],target=state.sides[to.side];
  if(state.complete||source.solved||target.solved)return {state,outcome:'locked',reason:'Este mecanismo já está aberto.'};
  if(!Number.isInteger(from.index)||from.index<0||from.index>=source[from.pan].length)
    return {state,outcome:'invalid',reason:'Este frasco já saiu do prato.'};
  if(from.side===to.side&&from.pan===to.pan)return {state,outcome:'unchanged',reason:'O frasco voltou ao seu prato.'};
  const value=source[from.pan][from.index],values=target[to.pan];
  if (!valuesForSide(state.config, to.side).includes(value))
    return {state,outcome:'invalid',reason:'Use um frasco da prateleira desta balança.'};
  if(values.length&&values[0]!==value)return {state,outcome:'invalid',reason:'Use frascos iguais neste prato. O frasco voltou à origem.'};
  if(values.length>=MAX_FLASKS||total(values)+value>MAX_TOTAL)return {state,outcome:'invalid',reason:'Este prato já está cheio. O frasco voltou à origem.'};
  const next=structuredClone(state);
  next.sides[from.side][from.pan].splice(from.index,1);next.sides[to.side][to.pan].push(value);
  return {state:next,outcome:'changed',reason:expression(next.sides[to.side][to.pan])};
}
export function act(state, action) {
  if(action.type==='move')return moveFlask(state,action);
  const { side, type, pan = 'left', value } = action;
  if (!SIDES.includes(side) || !['left', 'right'].includes(pan) || (side !== 'purple' && pan === 'right'))
    return { state, outcome: 'invalid', reason: 'Escolha uma balança.' };
  const current = state.sides[side];
  if (current.solved || state.complete) return { state, outcome: 'locked', reason: 'Este mecanismo já está aberto.' };
  const next = structuredClone(state), puzzle = next.sides[side], values = puzzle[pan];
  if (type === 'add') {
    if (!valuesForSide(state.config, side).includes(value)) return { state, outcome: 'invalid', reason: 'Escolha um frasco da prateleira desta balança.' };
    if (values.length && values[0] !== value) return { state, outcome: 'invalid', reason: 'Use frascos iguais neste prato. Esvazie para trocar o tipo.' };
    if (values.length >= MAX_FLASKS || total(values) + value > MAX_TOTAL)
      return { state, outcome: 'invalid', reason: 'O prato comporta até 10 frascos e 100 bolinhas.' };
    values.push(value);
  } else if (type === 'remove') {
    if (!values.length) return { state, outcome: 'empty', reason: 'Este prato está vazio.' };
    if(action.index!==undefined&&(!Number.isInteger(action.index)||action.index<0||action.index>=values.length))
      return {state,outcome:'invalid',reason:'Este frasco já saiu do prato.'};
    values.splice(action.index===undefined?values.length-1:action.index,1);
  } else if (type === 'clear') {
    puzzle[pan] = [];
  } else if (type === 'clearScale') {
    if (!puzzle.left.length && !puzzle.right.length)
      return { state, outcome: 'empty', reason: 'Esta balança já está vazia.' };
    puzzle.left = [];
    puzzle.right = [];
  } else if (type === 'submit') {
    if (!canSubmit(state, side)) return { state, outcome: 'ignored', reason: 'Ajuste os frascos antes de conferir.' };
    const success = side === 'purple' ? validatePurple(puzzle.left, puzzle.right) : validateConfiguredDial(puzzle.left, state.config.dialPuzzles[side]);
    puzzle.attempts++;
    puzzle.feedback = success ? 'success' : 'error';
    puzzle.detail = side === 'purple'
      ? (success ? expression(puzzle.left) + ' e ' + expression(puzzle.right) + '. Mesmo total!'
        : puzzle.left[0] === puzzle.right[0] ? 'Os totais podem ser iguais, mas cada prato precisa de um tipo diferente de frasco.'
        : 'O prato mais baixo tem mais bolinhas. Ajuste os grupos até os totais ficarem iguais.')
      : success ? expression(puzzle.left) : 'Você formou ' + expression(puzzle.left) + '. A marca da balança está em ' + state.config.targets[side] + '. Ajuste os grupos.';
    puzzle.solved = success;
    if (!success) { puzzle.errors++; puzzle.rejected.push(submissionKey(puzzle)); }
    next.events.push({ side, correct: success, left: [...puzzle.left], right: [...puzzle.right], attempt: puzzle.attempts });
    next.complete = isComplete(next);
    if (next.complete) next.reward = 'opening';
    return { state: next, outcome: success ? 'success' : 'error', reason: puzzle.detail };
  } else return { state, outcome: 'invalid', reason: 'Ação desconhecida.' };
  return { state: next, outcome: 'changed', reason: expression(puzzle[pan]) };
}


