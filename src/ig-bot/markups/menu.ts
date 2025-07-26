export const menuMarkup = async () => {
  return {
    message: `Choose an option:`,

    keyboard: [
      [
        {
          text: 'Monitor account ',
          callback_data: JSON.stringify({
            command: '/scanIG',
            language: 'instagram',
          }),
        },
      ],
    ],
  };
};
