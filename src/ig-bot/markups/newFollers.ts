export const newFollowersMarkUp = async (followers: any, account: any) => {
  //TODO:CHECK DISPLAY MAIL AND Number
  return {
    message: `<b>🔔 New followers for ➡️ ${account.username}  with less than 300 followers</b>:\n\n${followers
      .map(
        (user) =>
          `➡️<a href="https://www.instagram.com/${user.username}">@${user.username}</a> - followers:${user.followersCount}`,
      )
      .join('\n')}`,

    keyboard: [
      [
        {
          text: 'close ❌',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'tiktok',
          }),
        },
      ],
    ],
  };
};
