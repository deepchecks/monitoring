import React, { PropsWithChildren, useState } from 'react';
import { Link } from '@mui/material';
import { InfoIcon } from 'assets/icon/icon';
import { colors } from 'theme/colors';

interface InfoLinkItemProps {
  docsLink: string;
}

export function InfoLink({ docsLink }: PropsWithChildren<InfoLinkItemProps>) {
  const [isHovered, setIsHovered] = useState(false);
  const getColor = isHovered ? colors.primary.violet[400] : colors.neutral.lightText;
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
      onMouseEnter={() => setIsHovered(true)}
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
