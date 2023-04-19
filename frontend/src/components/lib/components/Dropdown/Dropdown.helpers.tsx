import React from 'react';

export const folderExampleProps = {
  label: 'Folder',
  data: [
    {
      name: 'Price',
      amount: '3 models'
    },
    {
      name: 'Popularity',
      amount: '4 models'
    },
    {
      name: 'Hosts',
      amount: '3 models'
    },
    {
      name: 'Locations',
      amount: '5 models'
    }
  ]
};

export const modelsExampleProps = {
  label: 'Models',
  data: [
    {
      name: 'Airbnb-rent-prices',
      amount: '3 alerts / 1 Critical'
    },
    {
      name: 'Car-prices',
      amount: 'No alerts'
    },
    {
      name: 'Ecommerce-customer-purchases',
      amount: '2 alerts / 0 Critical'
    }
  ]
};

export function highlightText(text: string, match: string) {
  return text.split(new RegExp(`(${match})`, 'gi')).map((part, i) =>
    part.toLowerCase() === match.toLowerCase() ? (
      part
    ) : (
      <span key={i} style={{ opacity: 0.6 }}>
        {part}
      </span>
    )
  );
}
