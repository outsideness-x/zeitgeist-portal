"use client";

import Image from 'next/image';

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  sizeClassName?: string;
  textClassName?: string;
  className?: string;
  alt?: string;
};

const getFallbackLetter = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) {
    return '?';
  }
  return trimmed.charAt(0).toUpperCase();
};

export const UserAvatar = ({
  name,
  avatarUrl,
  sizeClassName = 'h-8 w-8',
  textClassName = 'text-sm',
  className = '',
  alt,
}: UserAvatarProps) => {
  const fallbackLetter = getFallbackLetter(name);

  return (
    <div
      className={`${sizeClassName} relative overflow-hidden rounded-full bg-accent text-white flex items-center justify-center font-bold ${textClassName} ${className}`.trim()}
      aria-label={alt ?? `Аватар пользователя ${name}`}
      title={name}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={alt ?? `Аватар пользователя ${name}`}
          fill
          sizes="32px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <span aria-hidden="true">{fallbackLetter}</span>
      )}
    </div>
  );
};
