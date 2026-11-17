#!/usr/bin/env bash
set -euo pipefail

dashboard_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
guide_name='READY_FOR_LIBRARY_PUBLICATION.md'
source_path="${dashboard_dir}/../../documentation/dashboard/${guide_name}"
target_path="${dashboard_dir}/${guide_name}"

if [ -f "${source_path}" ]; then
  cp "${source_path}" "${target_path}"
elif [ ! -f "${target_path}" ]; then
  echo "${guide_name} is required to build the dashboard" >&2
  exit 1
fi
