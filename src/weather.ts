export const WEATHERS = ['clear', 'partly-cloudy', 'overcast', 'rainy'] as const

export type Weather = (typeof WEATHERS)[number]
