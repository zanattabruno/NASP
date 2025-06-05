#!/bin/bash
DEFAULT_NAMESPACES=(
    "ricplt"
    "nonrtric"
    "ricrapp"
    "ricxapp"
)

# Use provided namespaces if any, otherwise use DEFAULT_NAMESPACES
if [ "$#" -gt 0 ]; then
    NAMESPACES=("$@")
else
    NAMESPACES=("${DEFAULT_NAMESPACES[@]}")
fi

for ns in "${NAMESPACES[@]}"; do
    kubectl rollout restart deployment -n "$ns" &
    kubectl rollout restart statefulset -n "$ns" &
    kubectl rollout restart daemonset -n "$ns" &
    kubectl rollout restart job -n "$ns" &
done

wait