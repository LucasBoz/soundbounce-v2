/**
 * Created by paulbarrass on 29/04/2017.
 */
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {ROOM_CHAT} from 'redux/modules/shared/room';
import {Picker} from 'emoji-mart';
import TextInput from 'components/ui/textInput/TextInput';
import ArrowRight from '../../svg/icons/ArrowRight';
import ChatBubble from './ChatBubble.js';
import {uiUpdate} from 'redux/modules/ui';
import theme from './chatPanel.css';

// global emoji mart (the emoji picker) styles
import './emoji-mart.css';
import Emoticon from '../../svg/icons/Emoticon';

class ChatPanel extends Component {
	static propTypes = {
		onChatSend: PropTypes.func,
		actionLog: PropTypes.array,
		emojiPickerVisible: PropTypes.bool,
		setEmojiPickerVisible: PropTypes.func,
		chatText: PropTypes.string,
		updateChatText: PropTypes.func
	};

	chatEnterPressed = () => {
		this.props.onChatSend();
	};

	componentDidMount() {
		this.scrollLastChatIntoView();
	}

	scrollLastChatIntoView() {
		const {actionLog} = this.props;
		if (actionLog.length > 0) {
			const lastChatElement = this.refs[`logItem-${actionLog[actionLog.length - 1].id}`];
			if (lastChatElement) {
				lastChatElement.scrollIntoView();
			}
		}
	}

	componentDidUpdate(prevProps) {
		const {scroll} = this.refs;
		// if we've just loaded from having no actionLog,
		if (prevProps.actionLog.length === 0 ||
			// or we're near the bottom already
			(scroll.scrollTop + 150 >= (scroll.scrollHeight - scroll.offsetHeight))) {
			this.scrollLastChatIntoView();
		}
	}

	// this is to make items of same type (vote, chat etc), from same user, in a certain time span
	// group together so we don't have a million chat bubbles when someone (me?) is ranting ;)
	// or 20 tracks are dropped at once etc
	static groupSimilarActionLogItems(actionLog) {
		const groupedActionLog = [];
		for (let actionIndex = 0; actionIndex < actionLog.length; actionIndex++) {
			const action = actionLog[actionIndex];
			const groupedPayloads = [];
			groupedPayloads.push(action.payload); // add this payload

			// now look ahead and see if we should consume future actions, to group together into
			// a single bubble / message
			while (actionIndex + 1 < actionLog.length &&
			actionLog[actionIndex + 1].type === action.type &&
			actionLog[actionIndex + 1].payload.userId === action.payload.userId &&
			((new Date(actionLog[actionIndex + 1].timestamp)).getTime() -
			(new Date(actionLog[actionIndex].timestamp)).getTime()) < 1000 * 60) {
				groupedPayloads.push(actionLog[++actionIndex].payload);
			}

			// ok now we've grouped a bunch of payloads (potentially, we defo have at least one)
			groupedActionLog.push({
				...actionLog[actionIndex],
				payload: null,
				payloads: groupedPayloads
			});
		}
		return groupedActionLog;
	}

	hideEmojiPanel = (evt) => {
		const emojiMartPanel = document.getElementsByClassName('emoji-mart')[0];
		if (emojiMartPanel && emojiMartPanel.contains(evt.target)) {
			// we're clicking inside the emoji box, allow this
			return;
		}
		this.props.setEmojiPickerVisible(false);
		document.removeEventListener('click', this.hideEmojiPanel);
	};

	emojiButtonClick = () => {
		document.addEventListener('click', this.hideEmojiPanel);
		this.props.setEmojiPickerVisible(true);
	};

	clickEmojiInPanel = (emoji, event) => {
		// add space if there is content already
		const prefix = this.props.chatText ? this.props.chatText + ' ' : '';
		this.props.updateChatText(prefix + emoji.colons);
		// hide panel
		this.props.setEmojiPickerVisible(false);
		// focus the box so you can just press enter
		document.getElementById('roomChat').focus();
	};

	render() {
		const {emojiPickerVisible} = this.props;
		const actionLog = ChatPanel.groupSimilarActionLogItems(this.props.actionLog);
		return (
			<div className={theme.panel}>
				<div className={theme.chatScroll} ref='scroll'>
					<div className={theme.actionLog}>
						{actionLog.map((loggedAction) => {
							let item = <div>SB ERROR: Unknown actionLog item type?</div>;
							switch (loggedAction.type) {
								case ROOM_CHAT:
									item = <ChatBubble chat={loggedAction}/>;
									break;
								// todo: add track, vote, like etc etc
							}
							return (
								<div key={loggedAction.id}>
									{item}
									<div ref={`logItem-${loggedAction.id}`}/>
								</div>
							);
						})}
					</div>
				</div>
				<div className={theme.chatBox}>
					<TextInput uiKey='roomChat'
							   className={theme.input}
							   placeholder='Type message'
							   onEnterPressed={this.chatEnterPressed}/>
					{emojiPickerVisible && (
						<Picker set='twitter'
								emojiSize={20}
								perLine={9}
								sheetSize={64}
								autoFocus={true}
								include={['search', 'recent', 'people',
										  'nature', 'foods', 'activity',
										  'objects', 'symbols']}
								title='Pick an emoji'
								emoji='point_up'
								onClick={this.clickEmojiInPanel}
								style={{
									position: 'absolute',
									bottom: '2.5rem',
									right: '0.5rem'
								}}/>
					)}

					<div className={theme.emojiIcon} onClick={this.emojiButtonClick}>
						<Emoticon size={1.5}/>
					</div>
					<div className={theme.sendIcon} onClick={this.chatEnterPressed}>
						<ArrowRight/>
					</div>
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => ({
	emojiPickerVisible: state.ui['emojiPickerVisible'] || false,
	chatText: state.ui['roomChat'] || ''
});

const mapDispatchToProps = (dispatch, ownProps) => ({
	setEmojiPickerVisible: (show) => {
		dispatch(uiUpdate({key: 'emojiPickerVisible', newState: show}));
	},
	updateChatText: (text) => {
		dispatch(uiUpdate({key: 'roomChat', newState: text}));
	}
});

export default connect(mapStateToProps, mapDispatchToProps)(ChatPanel);

