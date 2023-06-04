import React, { PropsWithChildren, useState } from 'react';
import { Link } from '@mui/material';

import { theme } from 'components/lib/theme';

import { InfoIcon } from 'assets/icon/icon';

interface InfoLinkItemProps {
  docsLink: string;
}

export function InfoLink({ docsLink }: PropsWithChildren<InfoLinkItemProps>) {
  const [isHovered, setIsHovered] = useState(false);
  const getColor = isHovered ? theme.palette.primary.main : theme.palette.text.disabled;

  const onMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <Link
      title="link to deepchecks' documentation about the check"
      href={docsLink}
      target="_blank"
      sx={{
        color: getColor,
        textDecorationColor: getColor,
        textDecoration: isHovered ? 'unset' : 'underline',
        marginLeft: '0.6em'
      }}
      rel="noreferrer"
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      info
      <InfoIcon
        style={{
          verticalAlign: 'text-bottom',
          marginLeft: '0.1em'
        }}
        fill={getColor}
      />
    </Link>
  );
}
