import type { ReactElement } from 'react'
import NextLink from 'next/link'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'

interface StatCardProps {
  title: string
  value: number
  href?: string
}

export function StatCard({ title, value, href }: StatCardProps): ReactElement {
  const cardContent = (
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h3" component="p" sx={{ mt: 1.5, color: 'text.primary' }}>
        {value.toLocaleString('en-US')}
      </Typography>
    </CardContent>
  )

  const cardSx = (theme: Theme) => ({
    display: 'block',
    height: '100%',
    border: 1,
    borderColor: alpha(theme.palette.moss?.main ?? theme.palette.primary.main, 0.15),
    backgroundColor: 'background.paper',
    boxShadow: 2,
    textDecoration: 'none',
    color: 'inherit',
    transition: theme.transitions.create(['box-shadow', 'transform']),
    '&:hover': {
      boxShadow: 4,
      transform: 'translateY(-2px)',
    },
  })

  if (!href) {
    return <Card sx={cardSx}>{cardContent}</Card>
  }

  return <Card component={NextLink} href={href} sx={cardSx}>{cardContent}</Card>
}
