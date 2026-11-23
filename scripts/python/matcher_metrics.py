"""Pure-Python retrieval metrics for hirelabs-matcher (no numpy or torch needed)."""

from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple


def ranking_metrics(
    rankings: Dict[str, List[str]],
    relevant: Dict[str, Set[str]],
    ks: Iterable[int] = (5, 10),
) -> Dict:
    """Recall@k (a relevant resume in the top k) and MRR, macro-averaged over queries that have a relevant resume."""
    ks = tuple(ks)
    first_ranks: Dict[str, Optional[int]] = {}
    for query, ranked in rankings.items():
        wanted = relevant.get(query) or set()
        if not wanted:
            continue
        first_ranks[query] = next((rank for rank, doc in enumerate(ranked, start=1) if doc in wanted), None)

    count = len(first_ranks)
    result = {"queries": count, "first_relevant_rank": first_ranks}
    for k in ks:
        hits = sum(1 for rank in first_ranks.values() if rank is not None and rank <= k)
        result[f"recall_at_{k}"] = hits / count if count else 0.0
    result["mrr"] = sum(1 / rank for rank in first_ranks.values() if rank) / count if count else 0.0
    return result


def _average_ranks(values: Sequence[float]) -> List[float]:
    order = sorted(range(len(values)), key=lambda index: values[index])
    ranks = [0.0] * len(values)
    position = 0
    while position < len(order):
        end = position
        while end + 1 < len(order) and values[order[end + 1]] == values[order[position]]:
            end += 1
        average = (position + end) / 2 + 1
        for index in order[position:end + 1]:
            ranks[index] = average
        position = end + 1
    return ranks


def spearman(xs: Sequence[float], ys: Sequence[float]) -> Optional[float]:
    """Spearman rank correlation with average ranks for ties; None when either side is constant."""
    if len(xs) != len(ys) or len(xs) < 2:
        return None
    rx, ry = _average_ranks(xs), _average_ranks(ys)
    mean_x, mean_y = sum(rx) / len(rx), sum(ry) / len(ry)
    cov = sum((a - mean_x) * (b - mean_y) for a, b in zip(rx, ry))
    var_x = sum((a - mean_x) ** 2 for a in rx)
    var_y = sum((b - mean_y) ** 2 for b in ry)
    if var_x == 0 or var_y == 0:
        return None
    return cov / (var_x * var_y) ** 0.5


def mean_spearman(per_query: Dict[str, Tuple[Sequence[float], Sequence[float]]]) -> Dict:
    """Spearman per query (labels vs model scores) and their mean over queries where it is defined."""
    values = {query: spearman(labels, scores) for query, (labels, scores) in per_query.items()}
    defined = [value for value in values.values() if value is not None]
    return {"mean": sum(defined) / len(defined) if defined else None, "queries": len(defined), "per_query": values}
