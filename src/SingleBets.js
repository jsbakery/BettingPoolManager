import React, { Component } from 'react';
import { getSavedBetsState } from './utils';

class SingleBets extends Component {
    constructor(props) {
        super(props);

        this.state = {
            pool: [],
            poolTotal: 0.0,
            isComplete: props.isComplete,
            outcome: props.outcome,
            oweTables: [],
        };
        this.inputs = {};
        this.printStateToConsole = this.printStateToConsole.bind(this);
        this.addBet = this.addBet.bind(this);
    }

    componentDidMount() {
        const { file } = this.props;
        getSavedBetsState(file).then(savedAppState => this.setState(savedAppState));
    }

    printStateToConsole() {
        console.log(JSON.stringify(this.state, true));
    }

    declareWinner(team) {
        if (team) {
            this.setState({ isComplete: true, outcome: team });
        } else {
            this.setState({ isComplete: false });
        }
    }

    addBet() {
        const { pool, poolTotal } = this.state;
        const { nameElm, teamElm, betAmountElm } = this.inputs;
        const name = nameElm.value;
        const team = teamElm.value;
        const betAmount = parseFloat(betAmountElm.value);

        this.setState({
            pool: [...pool, { name, team, betAmount }],
            poolTotal: poolTotal + betAmount,
        });
        nameElm.value = teamElm.value = betAmountElm.value = '';
    }

    get teamPools() {
        const { pool } = this.state;
        const poolTeamMap = {};

        pool.forEach(bet => {
            if (poolTeamMap[bet.team]) {
                poolTeamMap[bet.team] += bet.betAmount;
            } else {
                poolTeamMap[bet.team] = bet.betAmount;
            }
        });

        return [
            Object.keys(poolTeamMap).map(team => ({ team, betAmount: poolTeamMap[team] })),
            poolTeamMap,
        ];
    }

    get bets() {
        const { pool, isComplete, outcome } = this.state;
        const [poolTeams, poolTeamMap] = this.teamPools;
        const owingAmounts = pool.reduce((oweMap, bet) => {
            const actualBetAmount = bet.team !== outcome && isComplete ? bet.betAmount : 0;

            oweMap[bet.name] = oweMap[bet.name]
                ? oweMap[bet.name] + actualBetAmount
                : actualBetAmount;

            return oweMap;
        }, {});

        return pool.map(bet => {
            const winningOffset = bet.betAmount / poolTeamMap[bet.team];
            const winningPool = poolTeams.reduce(
                (winPot, teamBet) =>
                    teamBet.team === bet.team ? winPot : winPot + teamBet.betAmount,
                0
            );
            const isWinningBet = isComplete && outcome === bet.team;
            const winningAmount =
                !isComplete || isWinningBet ? Math.floor(winningOffset * winningPool) : 0;
            const owingAmount = owingAmounts[bet.name];

            return {
                bet,
                isWinningBet,
                winningAmount,
                owingAmount,
                winningPool,
                winningOffset,
            };
        });
    }

    get owersWinners() {
        let allOwers = [];
        let allOwersCompute = [];
        let allWinners = [];
        let transactions = [];
        const addTransaction = (from, to, amount, totalAmount) =>
            transactions.push({ from, to, amount, totalAmount });

        this.bets.forEach(betData => {
            const { isWinningBet } = betData;
            (isWinningBet ? allWinners : allOwers).push(betData);
        });
        allOwers.sort((betDataA, betDataB) => betDataB.owingAmount - betDataA.owingAmount);
        allWinners.sort((betDataA, betDataB) => betDataB.winningAmount - betDataA.winningAmount);
        allOwersCompute = allOwers.slice();
        allWinners.slice().forEach(winnerData => {
            const { winningAmount, bet: { name: to } } = winnerData;
            let winningAmountCompute = winningAmount;
            allOwersCompute.forEach((owerCompute, owerIndex) => {
                let { owingAmount, bet: { name: from } } = owerCompute;
                if (owingAmount > 0 && winningAmountCompute > 0) {
                    if (owingAmount >= winningAmountCompute) {
                        addTransaction(from, to, winningAmountCompute, winningAmount);
                        owingAmount -= winningAmountCompute;
                        winningAmountCompute = 0;
                    } else {
                        addTransaction(from, to, owingAmount, winningAmount);
                        winningAmountCompute -= owingAmount;
                        owingAmount = 0;
                    }
                    allOwersCompute[owerIndex] = { ...owerCompute, owingAmount };
                }
            });
        });

        return {
            allWinners,
            allOwers,
            transactions,
        };
    }

    get teamPoolsUI() {
        const rows = this.teamPools[0].map(bet => {
            return (
                <tr key={`${bet.betAmount}${bet.team}`}>
                    <td>{bet.team}</td>
                    <td>₹ {bet.betAmount}</td>
                </tr>
            );
        });
        return <tbody>{rows}</tbody>;
    }

    get betsUI() {
        const { isComplete } = this.state;
        const rows = this.bets.map(
            ({ bet, winningOffset, winningPool, winningAmount, owingAmount }) => {
                return (
                    <tr key={`${bet.name}${bet.team}`}>
                        <th scope="row">{bet.name}</th>
                        <td>{bet.team}</td>
                        <td>₹ {bet.betAmount}</td>
                        <td>
                            <span className="text-success">₹ {winningAmount}</span>
                            {isComplete && (
                                <small className="text-danger"> [owes: ₹{owingAmount}]</small>
                            )}
                        </td>
                    </tr>
                );
            }
        );

        return <tbody>{rows}</tbody>;
    }

    get checkWinnerUI() {
        const { teams } = this.props;
        return [
            ...teams.map(team => (
                <button
                    className="btn btn-info btn-sm"
                    key={team}
                    onClick={() => this.declareWinner(team)}
                >
                    {team}
                </button>
            )),
            <button
                className="btn btn-info btn-sm"
                key="none"
                onClick={() => this.declareWinner(false)}
            >
                None
            </button>,
        ];
    }

    get owersWinnersUI() {
        return (
            <tbody>
                {this.owersWinners.transactions.map(({ from, to, amount }, index) => {
                    return (
                        <tr key={`${from}${to}${index}`}>
                            <th scope="row">{from}</th>
                            <td>{to}</td>
                            <td>₹ {amount}</td>
                        </tr>
                    );
                })}
            </tbody>
        );
    }

    render() {
        const { poolTotal, isComplete, outcome } = this.state;
        const { title, isOpen, teams } = this.props;
        const teamText = teams.join(' vs ');
        const spacing = <div className="spacing" style={{ marginTop: 15 }} />;

        return (
            <div className="container-fluid">
                <div className="row h-heading">
                    <div className="col text-center">
                        <h1>{title || teamText}</h1>
                    </div>
                </div>
                <div className="row h-heading">
                    <div className="col text-center">
                        <h3>Pool Total: ₹ {poolTotal}</h3>
                    </div>
                </div>
                <div className="row">
                    {isComplete && (
                        <div className="col text-center text-success">
                            <strong>{outcome} Won</strong>
                        </div>
                    )}
                </div>
                <table className="table table-striped table-hover">
                    <thead className="thead-dark">
                        <tr>
                            <th scope="col">
                                <strong>Team</strong>
                            </th>
                            <th scope="col">
                                <strong>Amount</strong>
                            </th>
                        </tr>
                    </thead>
                    {this.teamPoolsUI}
                </table>

                <section className="BetTallies">
                    <table className="table table-striped table-hover">
                        <thead className="thead-dark">
                            <tr>
                                <th scope="col">
                                    <strong>Name</strong>
                                </th>
                                <th scope="col">
                                    <strong>Team</strong>
                                </th>
                                <th scope="col">
                                    <strong>Amount</strong>
                                </th>
                                <th scope="col">
                                    <strong>Winnings</strong>
                                </th>
                            </tr>
                        </thead>
                        {this.betsUI}
                    </table>
                </section>

                {isOpen && (
                    <section>
                        <div className="form-row">
                            <div className="col input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Name"
                                    aria-label="Name"
                                    ref={elm => (this.inputs.nameElm = elm)}
                                />
                            </div>
                            <div className="col input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Team"
                                    aria-label="Team"
                                    ref={elm => (this.inputs.teamElm = elm)}
                                />
                            </div>
                            <div className="col input-group">
                                <div className="input-group-prepend">
                                    <span className="input-group-text">₹</span>
                                </div>
                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder="100 minimum"
                                    aria-label="Amount"
                                    ref={elm => (this.inputs.betAmountElm = elm)}
                                />
                            </div>
                        </div>
                        {spacing}
                        <div className="row">
                            <div className="col text-center">
                                <div className="btn-group" role="group">
                                    <button
                                        type="button"
                                        className="btn btn-dark"
                                        onClick={this.addBet}
                                    >
                                        Add
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ cursor: 'not-allowed' }}
                                        onClick={this.printStateToConsole}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                        {spacing}
                        <div className="row">
                            <div className="col text-center">
                                <small>Check Winner</small>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col text-center">
                                <div className="btn-group" role="group">
                                    {this.checkWinnerUI}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
                {isComplete && (
                    <section>
                        <div className="row">
                            <div className="col text-center">
                                <strong>Mini SplitWise</strong>
                            </div>
                        </div>
                        <table className="table table-striped table-hover">
                            <thead className="thead-dark">
                                <tr>
                                    <th scope="col">
                                        <strong>From</strong>
                                    </th>
                                    <th scope="col">
                                        <strong>To</strong>
                                    </th>
                                    <th scope="col">
                                        <strong>Amount</strong>
                                    </th>
                                </tr>
                            </thead>
                            {this.owersWinnersUI}
                        </table>
                    </section>
                )}
                <hr />
            </div>
        );
    }
}

export default SingleBets;
