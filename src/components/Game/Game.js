import React, {Component} from "react";
import Card from "../Card/Card";
import axios from "axios";
import "./Game.scss";
import {API_URL, cardValueLookup} from "../../constants/config"

export default class Game extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cards: [],
      drawnCards: [],
      previousCard: {},
      currentGuess: '',
      currentCorrectGuesses: 0,
      playerTurn: 1,
      score: {
        1: 0,
        2: 0
      },
      disableButtons: true
    };
  }

  /**
   * Get starter deck
   *
   * @returns {Promise<void>}
   */
  getDeck = async () => {
    try {
      const data = await axios.get(API_URL).then(({data}) => data);

      const cards = await axios
        .get(`https://deckofcardsapi.com/api/deck/${data.deck_id}/draw/?count=52`)
        .then(response => response.data.cards);

      this.setState({cards});
    } catch (e) {
      console.log(e.message)
    }
  }

  componentDidMount() {
    this.getDeck()
  }

  /**
   * Draw a card from the deck
   */
  drawNewCard = () => {
    this.setState(prevState => ({
      drawnCards: [
        ...prevState.drawnCards,
        prevState.cards[prevState.cards.length - 1]
      ],
      cards: [...prevState.cards.slice(0, -1)],
      previousCard: prevState.cards[prevState.cards.length - 1],
      disableButtons: false
    }))
  }

  /**
   * Toggle a players turn
   */
  togglePlayerTurn = () => {
    this.setState(prevState => ({
      playerTurn: (prevState.playerTurn === 1) ? 2 : 1
    }));
  }

  /**
   * Calculate points
   */
  calculatePoints = () => {
    const {playerTurn, drawnCards} = this.state

    this.setState(prevState => ({
      score: {
        ...prevState.score,
        [playerTurn]: prevState.score[playerTurn] += drawnCards.length
      }
    }));
  }

  /**
   * Calculate the winner for the entire game
   *
   * @returns {string}
   */
  calculateWinner = () => {
    const {score} = this.state

    if (score[1] < score[2]) return 'Player 1 Wins!'
    if (score[1] > score[2]) return 'Player 2 Wins!'
  }

  /**
   * Handle a correct guess
   */
  handleCorrectGuess = () => {
    this.setState(prevState => ({
      currentCorrectGuesses: prevState.currentCorrectGuesses += 1
    }));
  }

  /**
   * Handle a wrong guess
   */
  handleWrongGuess = () => {
    this.togglePlayerTurn()
    this.calculatePoints()

    this.setState({
      previousCard: {},
      currentCorrectGuesses: 0,
    });

    setTimeout(() => {
      this.setState({
        drawnCards: [],
        disableButtons: true
      })
    }, 1000)
  }

  /**
   * Check if an guess is correct
   *
   * @param currentGuess
   * @returns {string|boolean}
   */
  isGuessCorrect = (currentGuess) => {
    const {cards, previousCard} = this.state
    const currentCard = cards[cards.length - 1]

    // if no previous card, means it's the first draw
    if (!previousCard) return

    // correct guess
    if (
      (currentGuess === 'higher' && (cardValueLookup[currentCard.value] >= cardValueLookup[previousCard.value])) ||
      (currentGuess === 'lower' && (cardValueLookup[currentCard.value] <= cardValueLookup[previousCard.value]))
    ) {
      this.handleCorrectGuess()
      return true
    }
    // incorrect guess
    else if (currentGuess) {
      this.handleWrongGuess()
      return false
    } else {
      return 'no current guess'
    }
  }

  /**
   * Handle a guess
   *
   * @param event
   */
  handleGuess = (event) => {
    const {previousCard} = this.state;
    const currentGuess = event.target.value

    // this.setState({disableButtons: true})

    this.setState({currentGuess})

    this.drawNewCard()

    // if a card was drawn previously and there is a current guess, calculate answer
    if (previousCard && currentGuess) {
      this.isGuessCorrect(currentGuess)
    }
  }

  /**
   * Handle a pass
   */
  handlePass = () => {
    this.togglePlayerTurn()
    this.setState({
      currentGuess: '',
      currentCorrectGuesses: 0
    })
  }

  /**
   * Reset the game
   */
  resetGame = () => {
    this.getDeck()
    this.setState({
      cards: [],
      drawnCards: [],
      previousCard: {},
      currentGuess: '',
      playerTurn: 1,
      score: {1: 0, 2: 0}
    })
  }

  render() {
    const {cards, drawnCards, playerTurn, score, currentGuess, currentCorrectGuesses, disableButtons} = this.state;
    const currentPlayer = (playerTurn === 1) ? 2 : 1;
    const buttonsDisabled = (cards.length <= 0 || cards.length === 52 || disableButtons)

    let cardDisplay = ''
    if (drawnCards.length > 0 && cards.length !== 0) {
      cardDisplay = drawnCards.map((e, i) => (
        <Card key={i} src={e.image}/>
      ));
    } else if (currentGuess && cards.length !== 0) {
      cardDisplay = <p>Player {currentPlayer} lost this round</p>
    } else if (cards.length !== 0) {
      cardDisplay = <p>Player 1 goes first</p>
    } else if (cards.length <= 0) {
      cardDisplay = <h1>{this.calculateWinner()}</h1>
    }

    console.log(disableButtons)

    return (
      <div className="Game">
        <h1 className="Game-title">High / Low Card Game</h1>
        {(cards.length > 0) && <h2 className="Game-subtitle">Player {playerTurn} Goes!</h2>}
        <h3 className="Game-subtitle">Cards Left: {cards.length}</h3>
        {(cards.length > 0) && <h3 className="Game-subtitle">Point on the line: {(drawnCards.length <= 1) ? 0 : drawnCards.length - 1}</h3>}
        <h3 className="Game-subtitle">Player 1 Score: {score[1]}</h3>
        <h3 className="Game-subtitle">Player 2 Score: {score[2]}</h3>

        <div className="Game-btn-container">
          <button
            className={"Game-btn" + (buttonsDisabled ? ' hidden' : '')}
            value="higher"
            onClick={this.handleGuess}
            disabled={buttonsDisabled}
          >
            Higher
          </button>

          <button
            className={"Game-btn" + (currentCorrectGuesses < 3 ? ' hidden' : '')}
            value="higher"
            onClick={this.handlePass}
            disabled={buttonsDisabled}
          >
            Pass
          </button>

          <button
            className={"Game-btn" + (!buttonsDisabled || cards.length <= 0 ? ' hidden' : '')}
            value="higher"
            onClick={this.drawNewCard}
            disabled={!buttonsDisabled}
          >
            Draw
          </button>

          <button
            className={"Game-btn" + (buttonsDisabled ? ' hidden' : '')}
            value="lower"
            onClick={this.handleGuess}
            disabled={buttonsDisabled}
          >
            Lower
          </button>
        </div>

        <div className="Game-deck">{cardDisplay}</div>

        <button
          className="Game-btn"
          onClick={this.resetGame}
        >
          Reset Game
        </button>
      </div>
    );
  }
}
