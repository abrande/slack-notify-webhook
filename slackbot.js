const axios = require('axios');
const _ = require('lodash');
const config = require('./config');

axios.defaults.baseURL = 'https://slack.com/api';
axios.defaults.headers.common['Authorization'] = `Bearer ${config.SLACKBOT_TOKEN}`;
axios.defaults.headers['Accept'] = 'application/json';
axios.defaults.headers['Access-Control-Allow-Credentials'] = true;
axios.defaults.withCredentials = true;

const axiosParams = {
  headers: {
    'Content-type': 'application/x-www-form-urlencoded'
  }
};

const getSlackUsers = async () => { // slack users of specified channel
  try {
    const channelInfo = await axios.get('/conversations.members', {
      ...axiosParams,
      params: {
        channel: 'C01BT2Y7S4S' // general channel members
      }
    });
    if (channelInfo.data.ok) {
      return channelInfo.data.members;
    }
  } catch (e) {
    console.log('Error getting channel members: ', e);
  }
};

// users.info returns profiles for members of specified channel
const getUserProfiles = async () => {
  try {
    const slackUsers = await getSlackUsers();

    return await axios.all(slackUsers.map((userId => {
      return axios.get('/users.info', { ...axiosParams, params: { user: userId } })
      .then((res) => {
        if (res.data.ok) {
          return { id: res.data.user.id, username: res.data.user.name };
        }
      }).catch((e) => {
        console.log(`Error receiving user ${userId} profile`);
        return e;
      });
    })));
  } catch (e) {
    console.log('Error getting slack profiles: ', e);
  }
};

// practically we would store slack users information in a dynamodb to retrieve user information
// useful info to correlate - github id correlated to slack id
const getRequestedReviewers = async (githubResponse) => {
  try {
    const userProfiles = await getUserProfiles();
    if (githubResponse.action === 'review_requested') {
      const pr = _.get(githubResponse, 'pull_request');
      // get pr array, find matching name in user profiles, send message to that id
      return pr['requested_reviewers'].map((user) => {
        return userProfiles.find((slackUsers) => slackUsers.username === user.login).id;
      });
    }
  } catch (e) {
    return e;
  }
};

const sendMessage = async (githubResponse) => {
  try {
    const reviewers = await getRequestedReviewers(githubResponse);
    const pr = _.get(githubResponse, 'pull_request');
    // check if reviewers has a length
    return await axios.all(reviewers.map(id => {
      axios.post('/chat.postMessage', {
        channel: id,
        as_user: true,
        unfurl_links: true,
        unfurl_media: true,
        attachments: [
          {
            color: '#2eb886',
            pretext: 'You\'ve been requested for a review :sparkles:',
            author_name: pr.user.login,
            author_icon: pr.user['avatar_url'],
            title: pr.title + ' - ' + pr.head.repo['full_name'],
            thumb_url: pr.head.repo['svn_url'],
            text: pr['html_url'],
          }
        ]
      }, {
        headers: {
          'Content-type': 'application/json;charset=utf-8'
        }
      }).then((response) => {
        console.log('Success!');
      }).catch((error) => {
        console.log('Failed', error);
      });
    }));
  } catch (e) {
    return e;
  }
};

module.exports = {
  getRequestedReviewers,
  sendMessage
};