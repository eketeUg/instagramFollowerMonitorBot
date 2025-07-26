export const followersMarkUp = async (followers: any) => {
  return {
    message: `<b>Followings with less than 300 followers</b>:\n\n${followers
      .map(
        (user) =>
          `➡️<a href="https://www.instagram.com/${user.username}">@${user.username}</a> - followers:${user.followerCount}`,
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
