import { Injectable, Logger } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { HttpService } from '@nestjs/axios';
import * as dotenv from 'dotenv';
import {
  menuMarkup,
  newFollowersMarkUp,
  welcomeMessageMarkup,
} from './markups';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';
import { Account } from 'src/database/schemas/account.schema';
import { Cron } from '@nestjs/schedule';
dotenv.config();

const token = process.env.TELEGRAM_TOKEN;

const apiKeys = [
  process.env.RAPID_API_KEY_1,
  process.env.RAPID_API_KEY_2,
  process.env.RAPID_API_KEY_3,
  process.env.RAPID_API_KEY_4,
  process.env.RAPID_API_KEY_5,
];

@Injectable()
export class IgBotService {
  private readonly instagramBot: TelegramBot;
  private logger = new Logger(IgBotService.name);
  private currentKeyIndex = 0;
  private key;
  private isRunning = false;

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Account.name) private readonly AccountModel: Model<Account>,
  ) {
    this.key = this.getNextApiKey();
    this.instagramBot = new TelegramBot(token, { polling: true });
    this.instagramBot.on('message', this.handleRecievedMessages);
    this.instagramBot.on('callback_query', this.handleButtonCommands);
  }

  getNextApiKey = () => {
    const key = apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % apiKeys.length;
    return key;
  };

  handleRecievedMessages = async (
    msg: TelegramBot.Message,
  ): Promise<unknown> => {
    // this.logger.debug(msg);
    try {
      await this.instagramBot.sendChatAction(msg.chat.id, 'typing');
      function extractPlatformAndUsername(text) {
        const regex = /@([a-zA-Z0-9._]+)/;

        const match = text.match(regex);

        if (match) {
          return {
            platform: `instagram`,
            username: match[1], // The username after "@"
          };
        } else {
          return null; // Return null if no match is found
        }
      }

      const addMatch = extractPlatformAndUsername(msg.text.trim());

      if (msg.text.trim() === '/start') {
        const username: string = `${msg.from.username}`;
        const welcome = await welcomeMessageMarkup(username);
        const replyMarkup = {
          inline_keyboard: welcome.keyboard,
        };
        return await this.instagramBot.sendMessage(
          msg.chat.id,
          welcome.message,
          {
            reply_markup: replyMarkup,
          },
        );
      } else if (addMatch) {
        if (addMatch.platform === 'instagram') {
          console.log(addMatch.username);
          //TODO: VERIFY USERNAME BEFORE SAVING
          const validAccount: any = await this.validateInstagramAccount(
            addMatch.username,
            msg.chat.id,
          );
          if (
            validAccount.username &&
            Number(validAccount.followersCount) > 0
          ) {
            if (Number(validAccount.followersCount) > 60000) {
              return await this.instagramBot.sendMessage(
                msg.chat.id,
                `Account @${validAccount.username} followers it is above the iteration threshold`,
              );
            }
            return;
          }
          return;
        } else if (addMatch.platform === 'twitter') {
          return;
        }
        return;
      } else if (msg.text.trim() === '/menu') {
        return await this.defaultMenu(msg.chat.id);
      }
    } catch (error) {
      console.log(error);
      return await this.instagramBot.sendMessage(
        msg.chat.id,
        'There was an error processing your message',
      );
    }
  };

  handleButtonCommands = async (
    query: TelegramBot.CallbackQuery,
  ): Promise<unknown> => {
    this.logger.debug(query);
    let command: string;

    // const username = `${query.from.username}`;
    const chatId = query.message.chat.id;

    // function to check if query.data is a json type
    function isJSON(str: string) {
      try {
        JSON.parse(str);
        return true;
      } catch (e) {
        console.log(e);
        return false;
      }
    }

    if (isJSON(query.data)) {
      command = JSON.parse(query.data).command;
    } else {
      command = query.data;
    }

    try {
      console.log(command);

      switch (command) {
        case '/menu':
          try {
            await this.instagramBot.sendChatAction(chatId, 'typing');
            return await this.defaultMenu(chatId);
          } catch (error) {
            console.log(error);
            return;
          }

        case '/scanIG':
          try {
            await this.instagramBot.sendChatAction(chatId, 'typing');
            return await this.instagramUsernameInput(chatId);
          } catch (error) {
            console.log(error);
            return;
          }

        case '/close':
          await this.instagramBot.sendChatAction(
            query.message.chat.id,
            'typing',
          );
          return await this.instagramBot.deleteMessage(
            query.message.chat.id,
            query.message.message_id,
          );

        default:
          return await this.instagramBot.sendMessage(
            chatId,
            'There was an error processing your message',
          );
      }
    } catch (error) {
      console.log(error);
      return await this.instagramBot.sendMessage(
        chatId,
        'There was an error processing your message',
      );
    }
  };

  instagramUsernameInput = async (chatId: number) => {
    try {
      await this.instagramBot.sendMessage(chatId, '@username', {
        reply_markup: {
          force_reply: true,
        },
      });

      return;
    } catch (error) {
      console.log(error);
    }
  };

  defaultMenu = async (chatId: number) => {
    try {
      const menu = await menuMarkup();
      const replyMarkup = {
        inline_keyboard: menu.keyboard,
      };
      return await this.instagramBot.sendMessage(chatId, menu.message, {
        reply_markup: replyMarkup,
      });

      return;
    } catch (error) {
      console.log(error);
    }
  };

  validateInstagramAccount = async (username: string, chatId: number) => {
    console.log('KEY :', this.key);
    await this.instagramBot.sendChatAction(chatId, 'typing');
    try {
      const userScanned = await this.AccountModel.findOne({
        username: username.toLowerCase(),
      });

      if (userScanned) {
        console.log('reusing');
        const updatedAccount = await this.AccountModel.findOneAndUpdate(
          { userId: userScanned.userId },
          {
            $addToSet: { chatIds: chatId },
          },
          { upsert: true, new: true },
        );
        await this.instagramBot.sendMessage(
          chatId,
          `Account <a href="https://www.instagram.com/${username}">@${username}</a>\n\n Is set to be monitored, will alert you when a new follower with less than 300 follows it`,
          { parse_mode: 'HTML' },
        );

        return updatedAccount;
      }

      // Fetch the valid Twitter account information
      const validAccount = await this.httpService.axiosRef.post(
        `https://starapi1.p.rapidapi.com/instagram/user/get_web_profile_info`,
        { username: `${username}` },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-key': this.key,
            'x-rapidapi-host': process.env.RAPID_HOST,
          },
        },
      );

      // If valid account data is returned
      if (validAccount.data.response.body.data.user.id) {
        const updatedAccount = await this.AccountModel.findOneAndUpdate(
          { userId: validAccount.data.response.body.data.user.id }, // Find by userId
          {
            userId: validAccount.data.response.body.data.user.id, // Ensure userId is always included
            username: validAccount.data.response.body.data.user.username,
            followersCount:
              validAccount.data.response.body.data.user.edge_followed_by.count,
            email: validAccount.data.response.body.data.user.business_email,
            phone: validAccount.data.response.body.data.user.business_email,
            $addToSet: { chatIds: chatId },
          },
          { upsert: true, new: true }, // Create if not exists, return updated doc
        );

        await this.fetchNewFollowers(updatedAccount.userId);

        await this.instagramBot.sendMessage(
          chatId,
          `Account <a href="https://www.instagram.com/${username}">@${username}</a>\n\n Is set to be monitored, will alert you when a new follower with less than 300 follows it`,
          { parse_mode: 'HTML' },
        );

        return updatedAccount;
      }
    } catch (error) {
      this.logger.error(
        'Error in validateInstagramAccount:',
        error,
        error.stack,
      );
      console.error('Error validating Tiktok account:', error);
      return await this.instagramBot.sendMessage(
        chatId,
        `There was an error processing your action, please try again.`,
      );
    }
  };

  fetchNewFollowers = async (userId: string): Promise<Account> => {
    try {
      console.log('calling');
      const response = await this.httpService.axiosRef.post(
        `https://starapi1.p.rapidapi.com/instagram/user/get_followers`,
        {
          id: Number(`${userId}`),
          count: 12,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-key': this.key,
            'x-rapidapi-host': process.env.RAPID_HOST,
          },
        },
      );

      // Defensive: handle cases where followings is missing or not an array
      const data = response.data?.response.body || {};
      const followers = Array.isArray(data.users) ? data.users : [];

      if (
        !followers.length &&
        response.data?.msg === 'Profile user is hiding following list.'
      ) {
        await this.AccountModel.updateOne(
          { userId: userId },
          {
            turnedOffFollowingList: true,
          },
          { upsert: true },
        );
        return;
      }

      const formattedUsers = followers.map((user) => ({
        userId: user.id,
        username: user.username,
      }));

      const existingAccount = await this.AccountModel.findOne({ userId });
      const existingFollowers = existingAccount?.followers || [];

      //  Extract existing IDs
      const existingIds = new Set(existingFollowers.map((user) => user.userId));

      //  Find new entries not already present
      const newEntries = formattedUsers.filter(
        (user) => !existingIds.has(user.userId),
      );

      const newFollowersWithLessThan300Followers = [];
      for (const newEntry of newEntries) {
        const userDetails = await this.scanAnAccount(newEntry.userId);
        if (Number(userDetails.followersCount) <= 300) {
          newFollowersWithLessThan300Followers.push(userDetails);
        }
      }

      // Build update object
      const update: any = {
        $set: {
          newFollowers: newFollowersWithLessThan300Followers, // Overwrite with only new entries or empty
        },
      };

      if (newEntries.length > 0) {
        update.$addToSet = {
          followers: { $each: newEntries },
        };
      }

      const account = await this.AccountModel.findOneAndUpdate(
        { userId: userId },
        update,
        { upsert: true, new: true },
      );

      return account;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn('Rate limited! Retrying in 60 seconds...');
        await new Promise((resolve) => setTimeout(resolve, 60000));
      } else {
        this.logger.error(error, error.stack);
        console.error('Error fetching data:', error.message);
      }
    }
  };

  scanAnAccount = async (
    userId: string,
  ): Promise<{
    userId: any;
    username: any;
    followersCount: any;
    followings: any;
    email: any;
    phone: any;
  }> => {
    console.log('KEY :', this.key);

    try {
      // Fetch the valid IG account information
      const validAccount = await this.httpService.axiosRef.post(
        `https://starapi1.p.rapidapi.com/instagram/user/get_info_by_id`,
        { id: Number(`${userId}`) },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-key': this.key,
            'x-rapidapi-host': process.env.RAPID_HOST,
          },
        },
      );

      // If valid account data is returned
      if (validAccount.data.response.body.user.id) {
        return {
          userId: validAccount.data.response.body.user.id,
          username: validAccount.data.response.body.user.username,
          followersCount: validAccount.data.response.body.user.follower_count,
          followings: validAccount.data.response.body.user.following_count,
          email: validAccount.data.response.body.user.public_email,
          phone: validAccount.data.response.body.user.public_phone_number,
        };
      }
      return;
    } catch (error) {
      this.logger.error(
        'Error in sacnning InstagramAccount:',
        error,
        error.stack,
      );
      console.error('Error scanning IG account:', error);
    }
  };

  @Cron('*/1 * * * *') // Runs every minute
  async handleScanNewUser() {
    if (this.isRunning) {
      console.log('Previous cron still running, skipping...');
      return;
    }

    this.isRunning = true;

    function chunkArray(array: any[], size: number): any[][] {
      const result = [];
      for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
      }
      return result;
    }

    console.log('running cron');

    try {
      const accounts = await this.AccountModel.find();
      if (accounts.length === 0) {
        console.log('no account to track');
        return;
      }

      for (const account of accounts) {
        console.log('working on:', account.username);
        this.key = this.getNextApiKey();

        const accountDetail = await this.fetchNewFollowers(account.userId);

        if (
          accountDetail.newFollowers.length > 0 &&
          accountDetail.followers.length !== accountDetail.newFollowers.length
        ) {
          console.log('there is a new user for:', accountDetail.username);
          console.log(
            'number of new users:',
            accountDetail.newFollowers.length,
          );

          if (accountDetail.newFollowers.length > 100) {
            const chunkedFollowers = chunkArray(
              accountDetail.newFollowers,
              100,
            );

            for (const chunk of chunkedFollowers) {
              const markUp = await newFollowersMarkUp(chunk, account);
              const replyMarkup = {
                inline_keyboard: markUp.keyboard,
              };

              for (const chatId of accountDetail.chatIds) {
                // if (chatId.toString() === '7985572406') continue;
                try {
                  await this.instagramBot.sendMessage(chatId, markUp.message, {
                    reply_markup: replyMarkup,
                    parse_mode: 'HTML',
                  });
                } catch (error) {
                  console.log(error);
                }
              }
            }
          } else {
            const markUp = await newFollowersMarkUp(
              accountDetail.newFollowers,
              account,
            );
            const replyMarkup = {
              inline_keyboard: markUp.keyboard,
            };

            for (const chatId of accountDetail.chatIds) {
              try {
                await this.instagramBot.sendMessage(chatId, markUp.message, {
                  reply_markup: replyMarkup,
                  parse_mode: 'HTML',
                });
              } catch (error) {
                console.log(error);
              }
            }
          }
        }
        console.log('Done working on:', account.username);
        // DO NOT `return` here — keep going to the next account
      }
    } catch (error) {
      console.error('Error fetching users :', error);
    } finally {
      this.isRunning = false;
    }
  }
}
