import React, { Component } from 'react';

import SingleBets from './SingleBets';
import { getMeta } from './utils';

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            version: 0.2,
            games: [
                {
                    file: 'Russia-Croatia',
                    title: 'Russia vs Croatia',
                    isOpen: false,
                    isLive: false,
                    isComplete: true,
                    teams: ['Russia', 'Croatia'],
                    outcome: 'Croatia',
                },
            ],
            multiBet: {
                teams: ['Belgium', 'Croatia', 'England', 'France'],
            },
        };
    }
    componentDidMount() {
        getMeta().then(metadata => this.setState(metadata));
    }
    render() {
        const { games } = this.state;
        const allSigleBets = games.map(game => <SingleBets key={game.file} {...game} />);
        return <div className="container">{allSigleBets}</div>;
    }
}

export default App;
