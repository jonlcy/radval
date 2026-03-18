import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type KPICardProps = {
  title: string
  value: string
  subtitle?: string
  trend?: number // positive = up, negative = down, undefined = neutral
}

export default function KPICard({ title, value, subtitle, trend }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {(subtitle || trend !== undefined) && (
          <div className="flex items-center gap-1 mt-1">
            {trend !== undefined && (
              <>
                {trend > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : trend < 0 ? (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                ) : (
                  <Minus className="h-3 w-3 text-gray-400" />
                )}
              </>
            )}
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
