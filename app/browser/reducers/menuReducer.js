/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

// Constants
const appConstants = require('../../../js/constants/appConstants')
const windowConstants = require('../../../js/constants/windowConstants')
const settings = require('../../../js/constants/settings')
const electron = require('electron')
const BrowserWindow = electron.BrowserWindow
const Immutable = require('immutable')
//state
const {getByTabId} = require('../../common/state/tabState')

//util
const frameStateUtil = require('../../../js/state/frameStateUtil')
const {makeImmutable} = require('../../common/state/immutableUtil')
const locale = require('../../locale')
const menuUtil = require('../../common/lib/menuUtil')
//api
const { createMenu,setMenuItemChecked,updateRecentlyClosedMenuItems,isCurrentLocationBookmarked} = require('../menu')
let {appMenu,closedFrames,lastClosedUrl,currentLocation} = require('../menu') 
const doAction = (state, action) => {
    switch (action.actionType) {
      case appConstants.APP_SET_STATE:
        createMenu(state)
        break
      case windowConstants.WINDOW_SET_FOCUSED_FRAME:
        {
          // Update the checkbox next to "Bookmark Page" (Bookmarks menu)
          const frame = frameStateUtil.getFrameByTabId(state, action.tabId)
          if (frame) {
            currentLocation = frame.location
            setMenuItemChecked(state, locale.translation('bookmarkPage'), isCurrentLocationBookmarked(state))
          }
          break
        }
      case appConstants.APP_CHANGE_SETTING:
        if (action.key === settings.SHOW_BOOKMARKS_TOOLBAR) {
          // Update the checkbox next to "Bookmarks Toolbar" (Bookmarks menu)
          setMenuItemChecked(state, locale.translation('bookmarksToolbar'), action.value)
        }
        break
      case windowConstants.WINDOW_UNDO_CLOSED_FRAME:
        {
          if (!lastClosedUrl) {
            break
          }
          closedFrames = closedFrames.delete(lastClosedUrl)
          const nextLastFrame = closedFrames.last()
          lastClosedUrl = nextLastFrame ? nextLastFrame.get('location') : null
          updateRecentlyClosedMenuItems(state)
          break
        }
      case windowConstants.WINDOW_CLEAR_CLOSED_FRAMES:
        {
          if (!action.location) {
            closedFrames = new Immutable.OrderedMap()
            lastClosedUrl = null
          } else {
            closedFrames = closedFrames.delete(action.location)
            if (lastClosedUrl === action.location) {
              lastClosedUrl = null
            }
          }
          updateRecentlyClosedMenuItems(state)
          break
        }
      case appConstants.APP_TAB_CLOSE_REQUESTED:
        {
          action = makeImmutable(action)
          const tabId = action.get('tabId')
          if (tabId) {
            const tab = getByTabId(state, tabId)
            const frame = tab && tab.get('frame')
            if (tab && !tab.get('incognito') && frame && frameStateUtil.isValidClosedFrame(frame)) {
              lastClosedUrl = tab.get('url')
              closedFrames = closedFrames.set(tab.get('url'), tab.get('frame'))
              updateRecentlyClosedMenuItems(state)
            }
          }
          break
        }
      case appConstants.APP_ADD_BOOKMARK:
      case appConstants.APP_EDIT_BOOKMARK:
      case appConstants.APP_MOVE_BOOKMARK:
      case appConstants.APP_REMOVE_BOOKMARK:
      case appConstants.APP_ADD_BOOKMARK_FOLDER:
      case appConstants.APP_MOVE_BOOKMARK_FOLDER:
      case appConstants.APP_EDIT_BOOKMARK_FOLDER:
      case appConstants.APP_REMOVE_BOOKMARK_FOLDER:
        createMenu(state)
        break
      case appConstants.APP_ON_CLEAR_BROWSING_DATA:
        {
          const defaults = state.get('clearBrowsingDataDefaults')
          const temp = state.get('tempClearBrowsingData', Immutable.Map())
          const clearData = defaults ? defaults.merge(temp) : temp
          if (clearData.get('browserHistory')) {
            createMenu(state)
          }
          break
        }
      case windowConstants.WINDOW_CLICK_MENUBAR_SUBMENU:
        {
          const clickedMenuItem = menuUtil.getMenuItem(appMenu, action.label)
          if (clickedMenuItem) {
            const focusedWindow = BrowserWindow.getFocusedWindow()
            clickedMenuItem.click(clickedMenuItem, focusedWindow, focusedWindow.webContents)
          }
          break
        }
      default:
    }
  
    return state
}

module.exports = doAction;
