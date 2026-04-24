export const buttonBaseClassName =
  'inline-flex cursor-pointer items-center justify-center rounded-md text-sm font-semibold tracking-[-0.01em] transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70';

export const buttonPrimaryClassName = `${buttonBaseClassName} min-h-11 bg-zinc-950 px-4 text-white hover:bg-zinc-800 focus:ring-zinc-950`;

export const buttonSecondaryClassName = `${buttonBaseClassName} min-h-11 border border-zinc-200 bg-white px-4 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus:ring-zinc-300`;

export const buttonCompactClassName = `${buttonBaseClassName} min-h-9 px-3 text-xs focus:ring-zinc-300`;

export const buttonDangerClassName = `${buttonBaseClassName} min-h-11 border border-red-200 bg-red-50 px-4 text-red-700 hover:bg-red-100 focus:ring-red-200`;

export const buttonPrimaryElevatedClassName = `${buttonPrimaryClassName} min-h-12 px-6 shadow-[0_14px_34px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.24)] disabled:translate-y-0 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none`;

export const authButtonTextClassName = 'text-sm font-black tracking-[0.08em]';
