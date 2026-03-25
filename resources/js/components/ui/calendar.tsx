import * as React from 'react'
import { DayPicker } from 'react-day-picker'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={({
        months: 'flex flex-col gap-4',
        month: 'relative space-y-4 pt-8',
        caption: 'relative flex items-center justify-center pt-0.5',
        caption_label: 'pointer-events-none w-full text-center text-sm font-semibold',
        month_caption:
          'pointer-events-none absolute inset-x-1 top-0 flex items-center justify-center',
        month_caption_label: 'text-sm font-semibold',
        nav: 'absolute inset-x-5 top-2 z-10 flex items-center justify-between',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 dark:border-white/60 dark:bg-white dark:text-black dark:hover:bg-white/90'
        ),
        nav_button_previous: '',
        nav_button_next: '',
        // DayPicker v9 buttons (keep in sync with nav_button styling)
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 dark:border-white/60 dark:bg-white dark:text-black dark:hover:bg-white/90'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 dark:border-white/60 dark:bg-white dark:text-black dark:hover:bg-white/90'
        ),
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell:
          'text-muted-foreground w-8 rounded-md text-center text-[0.8rem] font-medium',
        row: 'mt-2 flex w-full',
        // v9 keys (UI.Day + SelectionState + DayFlag)
        day: 'relative flex h-8 w-8 items-center justify-center p-0 text-center text-sm',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-8 w-8 rounded-md p-0 font-normal aria-selected:opacity-100 hover:bg-muted/40'
        ),
        selected:
          '[&>button]:bg-foreground [&>button]:text-background [&>button]:hover:bg-foreground [&>button]:hover:text-background [&>button]:focus:bg-foreground [&>button]:focus:text-background',
        range_start:
          'rounded-l-md bg-muted/55 dark:bg-muted/45 [&>button]:!bg-foreground [&>button]:!text-background',
        range_middle:
          'bg-muted/55 dark:bg-muted/45 [&>button]:!bg-transparent [&>button]:!text-foreground dark:[&>button]:!text-foreground',
        range_end:
          'rounded-r-md bg-muted/55 dark:bg-muted/45 [&>button]:!bg-foreground [&>button]:!text-background',
        today:
          '[&>button]:bg-muted/60 [&>button]:text-foreground dark:[&>button]:bg-muted/60',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        // DayPicker v9 classNames
        weekdays: 'grid grid-cols-7',
        weekday:
          'text-muted-foreground rounded-md text-center text-[0.8rem] font-medium',
        weeks: 'space-y-1',
        week: 'mt-2 grid grid-cols-7',
        ...classNames,
      } as any)}
      {...props}
    />
  )
}

export { Calendar }
