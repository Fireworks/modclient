import escape from 'lodash/escape';
import findLast from 'lodash/findLast';
import punycode from 'punycode';
import linkifyHtml from 'linkifyjs/html';
import regexes from '../../regexes';
import chatIconsTemplate from './icons';
import sdbmCode from '../../util/sdbmCode';
import badgeTemplate from './badge';
import BadgesModule from '../../modules/Badges';
import BTTVModule from '../../modules/BTTV';
import CheermotesModule from '../../modules/Cheermotes';
import SettingsModule from '../../modules/Settings';
import FFZModule from '../../modules/FFZ';
import transformBadges from '../../util/transformBadges';
import colorFix from '../../util/colorFix';

const defaultColors = ['#e391b8', '#e091ce', '#da91de', '#c291db', '#ab91d9', '#9691d6', '#91a0d4', '#91b2d1', '#91c2cf', '#91ccc7', '#91c9b4', '#90c7a2', '#90c492', '#9dc290', '#aabf8f', '#b5bd8f', '#bab58f', '#b8a68e', '#b5998e', '#b38d8d'];
const intlNameTemplate = (name) => `<span class="chat-line-name-intl-login"> (${name})</span>`;

function renderWord(message, word) {
  const emote = BTTVModule.findEmote(word) || FFZModule.findEmote(word) || null;
  if (emote) {
    return `<img src="${emote.url}" class="chat-line-emote chat-line-emote-${emote.id} chat-line-${emote.provider}-emote" data-provider="${emote.provider}" title="${word}">`;
  }
  if (word[0] === '@') {
    return `<strong>${escape(word)}</strong>`;
  }
  const bitMatch = regexes.bitMatch.exec(word);
  if (bitMatch && message.tags.bits) {
    const cheermote = CheermotesModule.findCheermote(bitMatch[1]);
    if (cheermote) {
      const amount = parseInt(bitMatch[2], 10);
      // find the correct tier
      const cheerTier = findLast(cheermote.tiers, tier => tier.minBits <= amount);
      return `<img class="chat-line-emote chat-line-cheermote chat-line-emote-${cheermote.name}" alt="${cheerTier.name}" title="${cheerTier.name}" src="${cheerTier.url}">`
        + `<span class="chat-line-cheer-amount" style="color: ${cheerTier.color}">${amount}</span>`;
    }
  }
  return escape(word);
}

function renderText(message, emotes, action) {
  let characterArray = punycode.ucs2.decode(action ? action[1] : message.trailing);
  for (let i = 0; i < characterArray.length; i++) {
    characterArray[i] = punycode.ucs2.encode([characterArray[i]]);
  }
  for (let i = 0; i < emotes.length; i++) {
    const emote = emotes[i];
    const emoteName = characterArray.slice(emote.start, emote.end + 1).join('');
    characterArray[emote.start] = `<img class="chat-line-emote chat-line-emote-${emote.id} chat-line-twitch-emote" data-provider="twitch" title="${emoteName}" src="https://static-cdn.jtvnw.net/emoticons/v1/${emote.id}/1.0">`;
    for (let k = emote.start + 1; k <= emote.end; k++) {
      characterArray[k] = '';
    }
  }
  let word = '';
  let final = '';
  for (let i = 0; i < characterArray.length; i++) {
    if (characterArray[i] === undefined) {
      continue;
    } else if (characterArray[i] === ' ') {
      final += `${renderWord(message, word)} `;
      word = '';
    } else if (characterArray[i].length > 5) {
      final += `${renderWord(message, word)}`;
      final += characterArray[i];
      word = '';
    } else {
      word += characterArray[i];
    }
  }
  final += renderWord(message, word);
  return twemoji.parse(linkifyHtml(final));
}

function messageTemplate(message, userBadges) {
  const badges = message.tags.badges.split(',')
    .map((b) => {
      const split = b.split('/');
      return { name: split[0], version: split[1] };
    })
    .map((b) => {
      let badge = null;
      if (BadgesModule.globalBadges[b.name]) {
        badge = BadgesModule.globalBadges[b.name].versions[b.version];
      }
      if (BadgesModule.channelBadges[b.name]) {
        badge = BadgesModule.channelBadges[b.name].versions[b.version];
      }
      if (BadgesModule.overridenBadges[b.name] && badge) {
        badge.image_url_1x = BadgesModule.overridenBadges[b.name];
      }
      if (badge) {
        badge.name = b.name;
      }
      return badge;
    })
    .filter(b => b)
    .map((badge) => badgeTemplate(badge))
    .join('');
  const emotes = [];
  if (message.tags.emotes) {
    const emoteLists = message.tags.emotes.split('/');
    for (let i = 0; i < emoteLists.length; i++) {
      const [emoteId, _positions] = emoteLists[i].split(':');
      const positions = _positions.split(',');
      for (let j = 0; j < positions.length; j++) {
        const [start, end] = positions[j].split('-');
        emotes.push({
          start: parseInt(start, 10),
          end: parseInt(end, 10),
          id: emoteId,
        });
      }
    }
  }
  const escapedUsername = escape(message.prefix.split('!')[0]);
  let color = message.tags.color;
  if (!color || color === '') {
    color = defaultColors[sdbmCode(message.tags['user-id'] || escapedUsername) % (defaultColors.length)];
  }
  if (SettingsModule.settings.appearance.fixNameColor !== false) {
    color = colorFix(color);
  }
  const escapedDisplayName = escape(message.tags['display-name']);
  const intlName = escapedDisplayName.toLowerCase() !== escapedUsername;
  const action = regexes.action.exec(message.trailing);
  const messageBadges = transformBadges(message.tags.badges);
  let showIcons = false;
  if (userBadges.broadcaster && !messageBadges.staff) {
    showIcons = true;
  } else if (userBadges.moderator && !messageBadges.staff && !messageBadges.broadcaster && !messageBadges.moderator) {
    showIcons = true;
  }
  return `
    ${showIcons ? chatIconsTemplate(message.param.substring(1), escapedUsername, message.tags.id, message.tags['user-id'], escapedDisplayName) : ''}
    <span class="chat-line-badges">${badges}</span>
    <span class="chat-line-name">
      <span
        class="chat-line-name-inner"
        data-username="${escapedUsername}"
        data-display-name="${escapedDisplayName}"
        data-user-id="${message.tags['user-id']}"
        style="color: ${color}"
      >${escapedDisplayName}${intlName ? intlNameTemplate(escapedUsername) : ''}</span>${action ? '' : '<span class="chat-line-colon">:</span>'}
    </span>
    <span class="chat-line-text${action ? ' chat-line-text-action' : ''}"${action ? `style="color: ${color}"` : ''}>${renderText(message, emotes, action)}</span>
  `;
}

export default messageTemplate;
