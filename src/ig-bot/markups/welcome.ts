export const welcomeMessageMarkup = async (userName: string) => {
  return {
    message: `Hi @${userName}, Welcome to Instagram following scan bot.\n\n I can scan an Instagram user account and alert when a user with less than 300 followers, follows the account`,
    keyboard: [
      [
        {
          text: 'scan Instagram account 🎵',
          callback_data: JSON.stringify({
            command: '/scanIG',
            language: 'instagram',
          }),
        },
      ],
    ],
  };
};
