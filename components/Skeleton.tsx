'use client';

import { Box, Skeleton, Stack, Grid } from '@mui/material';

export function DashboardSkeleton() {
  return (
    <Box>
      {/* Stat cards row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <Skeleton variant="rounded" height={110} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
      {/* Chart area */}
      <Skeleton variant="rounded" height={320} sx={{ borderRadius: 2, mb: 3 }} />
      {/* Table rows */}
      <Skeleton variant="rounded" height={48} sx={{ borderRadius: 1, mb: 1 }} />
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} variant="rounded" height={40} sx={{ borderRadius: 1, mb: 0.5 }} />
      ))}
    </Box>
  );
}

export function PageSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={36} sx={{ borderRadius: 1, width: '40%' }} />
      <Skeleton variant="rounded" height={24} sx={{ borderRadius: 1, width: '60%' }} />
      <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2, mt: 2 }} />
      <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
    </Stack>
  );
}

export function GraphSkeleton() {
  return (
    <Box>
      <Skeleton variant="rounded" height={500} sx={{ borderRadius: 2 }} />
    </Box>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Stack spacing={0.5}>
      <Skeleton variant="rounded" height={48} sx={{ borderRadius: 1 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={40} sx={{ borderRadius: 1 }} />
      ))}
    </Stack>
  );
}
